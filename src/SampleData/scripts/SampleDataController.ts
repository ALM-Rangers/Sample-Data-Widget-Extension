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


/// <reference path="telemetryclient.ts" />

import WITRestClient = require("TFS/WorkItemTracking/RestClient");
import CoreRestClient = require("TFS/Core/RestClient");
import CoreContracts  = require("TFS/Core/Contracts");

import WorkRestClient = require("TFS/Work/RestClient");
import WorkContracts = require("TFS/Work/Contracts");

import SampleDataContracts = require("../scripts/SampleDataContract");
import TemplateServices = require("../scripts/TemplateServices");
import ServiceFactory = require("../scripts/ServiceFactory");
import ProgressBar = require("../scripts/ProgressBar");
import ParamUtils = require("../scripts/ParamUtils");



export interface ISampleDataController {

    Populate(template: SampleDataContracts.ISampleDataTemplate, progressBar: ProgressBar.ProgressBar): IPromise<SampleDataContracts.ISampleDataTemplate>;
    Remove(template: SampleDataContracts.ISampleDataTemplate, progressBar: ProgressBar.ProgressBar): IPromise<SampleDataContracts.ISampleDataTemplate>;

    PopulatedTemplates: SampleDataContracts.ISampleDataTemplate[];

    LoadTemplates(): IPromise<SampleDataContracts.ISampleDataTemplate[]> 
}

export class SampleDataController implements ISampleDataController {

    public PopulatedTemplates: SampleDataContracts.ISampleDataTemplate[];
    private serviceFactory: ServiceFactory.IServiceFactory;

    public constructor() {
        this.serviceFactory = new ServiceFactory.ServiceFactory();
    }

    public LoadTemplates(): IPromise<SampleDataContracts.ISampleDataTemplate[]> {
        var deferred = $.Deferred<SampleDataContracts.ISampleDataTemplate[]>();

        var templateService = new TemplateServices.TemplateService();

        var promises: IPromise<SampleDataContracts.ISampleDataTemplate[]>[] = [];
        promises.push(templateService.getDefaultTemplates());
        promises.push(templateService.LoadCustomTemplates());
        
        Q.all(promises).then(
            data=> {
                deferred.resolve(data[0].concat(data[1]));
            }
            , err=> {
                deferred.reject(err);
            }
        );

        return deferred.promise();
    }

    public Populate(template: SampleDataContracts.ISampleDataTemplate, progressBar: ProgressBar.ProgressBar): IPromise<SampleDataContracts.ISampleDataTemplate> {
        var deferred = $.Deferred<SampleDataContracts.ISampleDataTemplate>();
        var ctrl = this;

        if (template != null) {

            TelemetryClient.getClient().trackEvent("Populate", { TemplateName: template.Name });

            if (template.Parameters == null) {
                template.Parameters = [];
            }
            var systemParams: ParamUtils.ITemplateParameter[] = [];

            ParamUtils.addSystemParameters(systemParams);
            ParamUtils.addProcessTemplatesParameters().then(
                prmlst=> {
                    systemParams = systemParams.concat(prmlst);

                    template.Parameters = ParamUtils.calcUserParams(template.Parameters, systemParams);
                    template.Parameters = template.Parameters.concat(systemParams);
                    
                    ctrl.doPopulate(SampleDataContracts.executeAction.Populate, template, progressBar).then(
                        d=> {

                            deferred.resolve(d);
                        },
                        err=> {
                            deferred.reject(err);
                        });
                },
                err=> {
                    deferred.reject(err);
                });
        }
        else {
            deferred.resolve(null);
        }

        return deferred.promise();
    }

    private doPopulate(action: SampleDataContracts.executeAction, template: SampleDataContracts.ISampleDataTemplate, progressBar: ProgressBar.ProgressBar): IPromise<SampleDataContracts.ISampleDataTemplate> {
        var deferred = $.Deferred<SampleDataContracts.ISampleDataTemplate>();
        var ctrl = this;

        console.log("*** populate all undependent")


        var lst: IPromise<SampleDataContracts.ISampleDataServiceTemplate>[] = [];

        template.DataServices.filter(t=> { return t.DependentOn == null; }).forEach(serviceTemplate => {
            console.log("*** populating " + serviceTemplate.Service);

            var task = progressBar.StartTask(serviceTemplate.Name);
            lst.push(this.ExecuteThisAndDependent(action, serviceTemplate, template, task, progressBar))

        });

        Q.all(lst).then(
            data => {
                progressBar.ProgressMessageStart = "";
                if (progressBar.allTasksPassed()) {
                    template.InstalledDate = new Date();
                }

                var saveTask = progressBar.StartTask("Saving template data");
                saveTask.Start();
                ctrl.updatePopulatedTemplates(template, action == SampleDataContracts.executeAction.Populate).then(
                    data => {
                        saveTask.Done();
                        console.log("SaveDone ");
                        ctrl.PopulatedTemplates = data;
                        deferred.resolve(template);
                    },
                    err=> {
                        saveTask.Fail();
                        saveTask.Log(err);
                        console.log("Err saving populated data");
                        deferred.reject(err);
                    }
                );
            },
            err => {
                console.log("*** Error:" + err);
                deferred.reject(err);
            }
        );


        return deferred.promise();
    }

    public Remove(template: SampleDataContracts.ISampleDataTemplate, progressBar: ProgressBar.ProgressBar): IPromise<SampleDataContracts.ISampleDataTemplate> {
        var deferred = $.Deferred<SampleDataContracts.ISampleDataTemplate>();
        var ctrl = this;

        if (template != null) {

            TelemetryClient.getClient().trackEvent("Remove", { TemplateName: template.Name });

            if (template.Parameters == null) {
                template.Parameters = [];
            }
            ParamUtils.addSystemParameters(template.Parameters);
            ParamUtils.addProcessTemplatesParameters().then(
                prmlst=> {
                    template.Parameters = template.Parameters.concat(prmlst);
                    ctrl.doPopulate(SampleDataContracts.executeAction.Remove, template, progressBar).then(
                        d=> {
                            deferred.resolve(d);
                        },
                        err=> {
                            deferred.reject(err);
                        });
                },
                err=> {
                    deferred.reject(err);
                });
        }
        else {
            deferred.resolve(null);
        }

        return deferred.promise();
    }


    private ExecuteThisAndDependent(action: SampleDataContracts.executeAction, serviceTemplate: SampleDataContracts.ISampleDataServiceTemplate, template: SampleDataContracts.ISampleDataTemplate, task: ProgressBar.ProgressTask, progressBar: ProgressBar.ProgressBar): IPromise<SampleDataContracts.ISampleDataServiceTemplate> {
        var deferred = $.Deferred<SampleDataContracts.ISampleDataServiceTemplate>();
        var ctrl = this;

        var promiseDependent: IPromise<SampleDataContracts.ISampleDataServiceTemplate>;
        if (action == SampleDataContracts.executeAction.Remove) {
            console.log("*** Executing dependent to " + serviceTemplate.Service);
            promiseDependent = ctrl.ExecuteDependentSerivces(action, serviceTemplate, template, task, progressBar);
            console.log("*** Done executing dependent to " + serviceTemplate.Service);
        }
        else {
            var deferredDependent = $.Deferred<SampleDataContracts.ISampleDataServiceTemplate>();
            deferredDependent.resolve(null);
            promiseDependent = deferredDependent.promise();
        }
        promiseDependent.then(
            dataDependent => {
                var service = this.serviceFactory.getService(serviceTemplate.Service);
                var promise: IPromise<any>;
                try {
                    promise = (action == SampleDataContracts.executeAction.Populate ? service.PopulateData(serviceTemplate, template.Parameters) : service.RemoveData(serviceTemplate, template.Parameters));
                    if (promise != null) {
                        promise.then(
                            data=> {
                                task.Done();
                                if (action == SampleDataContracts.executeAction.Populate) {
                                    console.log("*** populating dependent to " + serviceTemplate.Service);
                                    ctrl.ExecuteDependentSerivces(action, serviceTemplate, template, task, progressBar).then(
                                        dependentData=> {
                                            deferred.resolve(dependentData);
                                        },
                                        err=> {
                                            deferred.reject(err);
                                        });
                                }
                                else {
                                    deferred.resolve(data)
                                }
                                console.log("*** Done populating " + serviceTemplate.Service);
                            },
                            err=> {
                                task.Fail();
                                task.Log(err);
                                console.log("***      ERR Executing " + serviceTemplate.Service);
                                TelemetryClient.getClient().trackException(err, "SampleDataController.ExecuteThisAndDependent", { Service: serviceTemplate.Service });
                                deferred.resolve(serviceTemplate);
                            }
                        );
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
            },
            err=> {
                TelemetryClient.getClient().trackException(err, "SampleDataController.ExecuteThisAndDependent");
                deferred.reject(err);
            });


        return deferred.promise();
    }


    private ExecuteDependentSerivces(action: SampleDataContracts.executeAction, serviceTemplate: SampleDataContracts.ISampleDataServiceTemplate, template: SampleDataContracts.ISampleDataTemplate, task: ProgressBar.ProgressTask, progressBar: ProgressBar.ProgressBar): IPromise<SampleDataContracts.ISampleDataServiceTemplate> {
        var deferred = $.Deferred<SampleDataContracts.ISampleDataServiceTemplate>();
        var ctrl = this;

        var lst: IPromise<SampleDataContracts.ISampleDataServiceTemplate>[] = [];
        template.DataServices.filter(t=> { return t.DependentOn == serviceTemplate.Service; }).forEach(dependentService => {
            console.log("***      Now populating dependent service " + dependentService.Service);
            var task = progressBar.StartTask(dependentService.Name);
            lst.push(ctrl.ExecuteThisAndDependent(action, dependentService, template, task, progressBar))
        });

        Q.all(lst).then(
            data=> {
                deferred.resolve(serviceTemplate);
            },
            err => {
                console.log("***      ERR Saving");
                TelemetryClient.getClient().trackException(err, "SampleDataController.ExecuteDependentSerivces", { Service: serviceTemplate.Service });
                deferred.reject(err);
            }
        );
        return deferred.promise();
    }

    private updatePopulatedTemplates(template: SampleDataContracts.ISampleDataTemplate, add: boolean): IPromise<SampleDataContracts.ISampleDataTemplate[]> {
        var deferred = $.Deferred<SampleDataContracts.ISampleDataTemplate[]>();

        var templateService = new TemplateServices.TemplateService();

        templateService.getPopulatedTemplates().then(
            lstPop => {
                if (add) {
                    lstPop.push(template);
                } else {
                    lstPop.splice(lstPop.indexOf(template), 1);
                }
                templateService.savePopulatedTemplates(lstPop).then(
                    savedDoc=> {
                        // logCallBack("All Done");
                        deferred.resolve(lstPop);
                    });
            },
            err=> {
                if (add) {
                    var lstPop: SampleDataContracts.ISampleDataTemplate[] = [template];
                    templateService.savePopulatedTemplates(lstPop).then(
                        savedDoc=> {
                            // logCallBack("All Done");
                            deferred.resolve(lstPop);
                        });
                };

            });

        return deferred.promise();
    }
}

export interface INotifyCallBack { Notify(message: string): void }

var instance: callBack;

export function getInstance(): callBack {
    if (!instance) {
        instance = new callBack();

    }
    return instance;
}

export class callBack {
   
    public notifyCallback: INotifyCallBack;

    public constructor() {
    }

    
    public DoCallback() {
        this.notifyCallback.Notify("");
    }

}


