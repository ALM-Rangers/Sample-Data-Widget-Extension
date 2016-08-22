//---------------------------------------------------------------------
// <copyright file="SampleDataController.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>
// </summary>
//---------------------------------------------------------------------
define(["require", "exports", "../scripts/SampleDataContract", "../scripts/TemplateServices", "../scripts/ServiceFactory", "../scripts/ParamUtils"], function (require, exports, SampleDataContracts, TemplateServices, ServiceFactory, ParamUtils) {
    var SampleDataController = (function () {
        function SampleDataController() {
            this.serviceFactory = new ServiceFactory.ServiceFactory();
        }
        SampleDataController.prototype.LoadTemplates = function () {
            var deferred = $.Deferred();
            var templateService = new TemplateServices.TemplateService();
            var promises = [];
            promises.push(templateService.getDefaultTemplates());
            promises.push(templateService.LoadCustomTemplates());
            Q.all(promises).then(function (data) {
                deferred.resolve(data[0].concat(data[1]));
            }, function (err) {
                deferred.reject(err);
            });
            return deferred.promise();
        };
        SampleDataController.prototype.Populate = function (template, progressBar) {
            var deferred = $.Deferred();
            var ctrl = this;
            if (template != null) {
                TelemetryClient.getClient().trackEvent("Populate", { TemplateName: template.Name });
                if (template.Parameters == null) {
                    template.Parameters = [];
                }
                var systemParams = [];
                ParamUtils.addSystemParameters(systemParams);
                ParamUtils.addProcessTemplatesParameters().then(function (prmlst) {
                    systemParams = systemParams.concat(prmlst);
                    template.Parameters = ParamUtils.calcUserParams(template.Parameters, systemParams);
                    template.Parameters = template.Parameters.concat(systemParams);
                    ctrl.doPopulate(SampleDataContracts.executeAction.Populate, template, progressBar).then(function (d) {
                        deferred.resolve(d);
                    }, function (err) {
                        deferred.reject(err);
                    });
                }, function (err) {
                    deferred.reject(err);
                });
            }
            else {
                deferred.resolve(null);
            }
            return deferred.promise();
        };
        SampleDataController.prototype.doPopulate = function (action, template, progressBar) {
            var _this = this;
            var deferred = $.Deferred();
            var ctrl = this;
            console.log("*** populate all undependent");
            var lst = [];
            template.DataServices.filter(function (t) { return t.DependentOn == null; }).forEach(function (serviceTemplate) {
                console.log("*** populating " + serviceTemplate.Service);
                var task = progressBar.StartTask(serviceTemplate.Name);
                lst.push(_this.ExecuteThisAndDependent(action, serviceTemplate, template, task, progressBar));
            });
            Q.all(lst).then(function (data) {
                progressBar.ProgressMessageStart = "";
                if (progressBar.allTasksPassed()) {
                    template.InstalledDate = new Date();
                }
                var saveTask = progressBar.StartTask("Saving template data");
                saveTask.Start();
                ctrl.updatePopulatedTemplates(template, action == SampleDataContracts.executeAction.Populate).then(function (data) {
                    saveTask.Done();
                    console.log("SaveDone ");
                    ctrl.PopulatedTemplates = data;
                    deferred.resolve(template);
                }, function (err) {
                    saveTask.Fail();
                    saveTask.Log(err);
                    console.log("Err saving populated data");
                    deferred.reject(err);
                });
            }, function (err) {
                console.log("*** Error:" + err);
                deferred.reject(err);
            });
            return deferred.promise();
        };
        SampleDataController.prototype.Remove = function (template, progressBar) {
            var deferred = $.Deferred();
            var ctrl = this;
            if (template != null) {
                TelemetryClient.getClient().trackEvent("Remove", { TemplateName: template.Name });
                if (template.Parameters == null) {
                    template.Parameters = [];
                }
                ParamUtils.addSystemParameters(template.Parameters);
                ParamUtils.addProcessTemplatesParameters().then(function (prmlst) {
                    template.Parameters = template.Parameters.concat(prmlst);
                    ctrl.doPopulate(SampleDataContracts.executeAction.Remove, template, progressBar).then(function (d) {
                        deferred.resolve(d);
                    }, function (err) {
                        deferred.reject(err);
                    });
                }, function (err) {
                    deferred.reject(err);
                });
            }
            else {
                deferred.resolve(null);
            }
            return deferred.promise();
        };
        SampleDataController.prototype.ExecuteThisAndDependent = function (action, serviceTemplate, template, task, progressBar) {
            var _this = this;
            var deferred = $.Deferred();
            var ctrl = this;
            var promiseDependent;
            if (action == SampleDataContracts.executeAction.Remove) {
                console.log("*** Executing dependent to " + serviceTemplate.Service);
                promiseDependent = ctrl.ExecuteDependentSerivces(action, serviceTemplate, template, task, progressBar);
                console.log("*** Done executing dependent to " + serviceTemplate.Service);
            }
            else {
                var deferredDependent = $.Deferred();
                deferredDependent.resolve(null);
                promiseDependent = deferredDependent.promise();
            }
            promiseDependent.then(function (dataDependent) {
                var service = _this.serviceFactory.getService(serviceTemplate.Service);
                var promise;
                try {
                    promise = (action == SampleDataContracts.executeAction.Populate ? service.PopulateData(serviceTemplate, template.Parameters) : service.RemoveData(serviceTemplate, template.Parameters));
                    if (promise != null) {
                        promise.then(function (data) {
                            task.Done();
                            if (action == SampleDataContracts.executeAction.Populate) {
                                console.log("*** populating dependent to " + serviceTemplate.Service);
                                ctrl.ExecuteDependentSerivces(action, serviceTemplate, template, task, progressBar).then(function (dependentData) {
                                    deferred.resolve(dependentData);
                                }, function (err) {
                                    deferred.reject(err);
                                });
                            }
                            else {
                                deferred.resolve(data);
                            }
                            console.log("*** Done populating " + serviceTemplate.Service);
                        }, function (err) {
                            task.Fail();
                            task.Log(err);
                            console.log("***      ERR Executing " + serviceTemplate.Service);
                            TelemetryClient.getClient().trackException(err, "SampleDataController.ExecuteThisAndDependent", { Service: serviceTemplate.Service });
                            deferred.resolve(serviceTemplate);
                        });
                    }
                    else {
                        deferred.resolve(serviceTemplate);
                    }
                }
                catch (ex) {
                    task.Fail();
                    task.Log(ex);
                    TelemetryClient.getClient().trackException(ex, "SampleDataController.ExecuteThisAndDependent");
                    deferred.resolve(serviceTemplate);
                }
            }, function (err) {
                TelemetryClient.getClient().trackException(err, "SampleDataController.ExecuteThisAndDependent");
                deferred.reject(err);
            });
            return deferred.promise();
        };
        SampleDataController.prototype.ExecuteDependentSerivces = function (action, serviceTemplate, template, task, progressBar) {
            var deferred = $.Deferred();
            var ctrl = this;
            var lst = [];
            template.DataServices.filter(function (t) { return t.DependentOn == serviceTemplate.Service; }).forEach(function (dependentService) {
                console.log("***      Now populating dependent service " + dependentService.Service);
                var task = progressBar.StartTask(dependentService.Name);
                lst.push(ctrl.ExecuteThisAndDependent(action, dependentService, template, task, progressBar));
            });
            Q.all(lst).then(function (data) {
                deferred.resolve(serviceTemplate);
            }, function (err) {
                console.log("***      ERR Saving");
                TelemetryClient.getClient().trackException(err, "SampleDataController.ExecuteDependentSerivces", { Service: serviceTemplate.Service });
                deferred.reject(err);
            });
            return deferred.promise();
        };
        SampleDataController.prototype.updatePopulatedTemplates = function (template, add) {
            var deferred = $.Deferred();
            var templateService = new TemplateServices.TemplateService();
            templateService.getPopulatedTemplates().then(function (lstPop) {
                if (add) {
                    lstPop.push(template);
                }
                else {
                    lstPop.splice(lstPop.indexOf(template), 1);
                }
                templateService.savePopulatedTemplates(lstPop).then(function (savedDoc) {
                    // logCallBack("All Done");
                    deferred.resolve(lstPop);
                });
            }, function (err) {
                if (add) {
                    var lstPop = [template];
                    templateService.savePopulatedTemplates(lstPop).then(function (savedDoc) {
                        // logCallBack("All Done");
                        deferred.resolve(lstPop);
                    });
                }
                ;
            });
            return deferred.promise();
        };
        return SampleDataController;
    })();
    exports.SampleDataController = SampleDataController;
    var instance;
    function getInstance() {
        if (!instance) {
            instance = new callBack();
        }
        return instance;
    }
    exports.getInstance = getInstance;
    var callBack = (function () {
        function callBack() {
        }
        callBack.prototype.DoCallback = function () {
            this.notifyCallback.Notify("");
        };
        return callBack;
    })();
    exports.callBack = callBack;
});
//# sourceMappingURL=SampleDataController.js.map