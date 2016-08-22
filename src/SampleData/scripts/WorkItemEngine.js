define(["require", "exports", "../scripts/ParamUtils"], function (require, exports, ParamUtils) {
    var WorkItemEninge = (function () {
        function WorkItemEninge(workItemRestClient, context) {
            this.witClient = workItemRestClient;
            this.webContext = context;
        }
        WorkItemEninge.prototype.CreateWorkItems = function (template, parameterList) {
            var deferred = $.Deferred();
            var root = null;
            var lst = this.BuildWorkItemsFromTemplate(template, parameterList, root);
            this.CreateInitialWorkItems(lst).then(function (data) {
                deferred.resolve(data.map(function (i) { return i.createdId; }));
            }, function (err) {
                TelemetryClient.getClient().trackException(err, "WorkItemEngine.CreateWorkItems");
                alert(err);
            });
            return deferred.promise();
        };
        WorkItemEninge.prototype.RemoveWorkItems = function (wiList) {
            var _this = this;
            var deferred = $.Deferred();
            var lst = [];
            console.log("Deleting " + wiList.join(", "));
            var wiql = "Select ID FROM  WorkItemLinks WHERE  ([Source].[System.Id]  In(" + wiList.join(",") + ") AND ([System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward')  AND  [Target].[System.Id] IN (" + wiList.join(", ") + ") ) ORDER BY System.Id  mode(Recursive)";
            //  var deleteList: Contracts.WorkItemDelete[] = [];
            this.witClient.queryByWiql({ query: wiql }, VSS.getWebContext().project.name).then(function (existingWorkItemResults) {
                var rootWiList = existingWorkItemResults.workItemRelations.filter(function (i) {
                    return i.source == null;
                });
                if (rootWiList.length > 0) {
                    rootWiList.forEach(function (item) {
                        lst.push(_this.witClient.deleteWorkItem(item.target.id, false));
                    });
                    Q.all(lst).then(function (deleteList) {
                        console.log("Done Deleting ");
                        _this.RemoveWorkItems(wiList).then(function (items) {
                            if (items != null) {
                                deleteList = deleteList.concat(items);
                            }
                            deferred.resolve(deleteList);
                        }, function (err) {
                            console.log("Error Deleting ");
                            TelemetryClient.getClient().trackException(err, "WorkItemEngine.RemoveWorkItems");
                            deferred.reject(err);
                        });
                    }, function (err) {
                        console.log("Error Deleting ");
                        TelemetryClient.getClient().trackException(err, "WorkItemEngine.RemoveWorkItems");
                        deferred.reject(err);
                    });
                }
                else {
                    deferred.resolve(null);
                }
            }, function (err) {
                console.log("Error Deleting ");
                TelemetryClient.getClient().trackException(err, "WorkItemEngine.RemoveWorkItems");
                deferred.reject(err);
            });
            return deferred.promise();
        };
        WorkItemEninge.prototype.CreateInitialWorkItems = function (wiList) {
            var _this = this;
            var deferred = $.Deferred();
            var engine = this;
            var wiToSave = wiList.length;
            wiList.forEach(function (wi) {
                var thisWi = wi;
                _this.witClient.updateWorkItemTemplate(wi.param, VSS.getWebContext().project.name, wi.type, false, true).then(function (workItem) {
                    thisWi.createdId = workItem.id;
                    thisWi.createdUrl = workItem.url;
                    wiToSave--;
                    if (wiToSave == 0) {
                        engine.LinkWorkItemsTogether(wiList).then(function (lst) {
                            deferred.resolve(lst);
                        });
                    }
                }, function (err) {
                    TelemetryClient.getClient().trackException(err, "WorkItemEngine.CreateInitialWorkItems", { WorkItem: wi.title });
                    deferred.reject(err);
                });
            });
            return deferred.promise();
        };
        WorkItemEninge.prototype.LinkWorkItemsTogether = function (wiList) {
            var deferred = $.Deferred();
            var engine = this;
            var promiseList = [];
            wiList.forEach(function (wi) {
                if (wi.postCreateLinks != null && wi.postCreateLinks == true) {
                    var templateWi = wi;
                    var params = [];
                    var parent = wiList.filter(function (i) { return i.templateWorkItemId == templateWi.Parent; })[0];
                    if (parent != null) {
                        params.push({
                            "op": "add", "path": "/relations/-", "value": {
                                "rel": templateWi.LinkType,
                                "url": parent.createdUrl
                            }
                        });
                        promiseList.push(engine.witClient.updateWorkItem(params, wi.createdId, false, false));
                    }
                }
            });
            Q.all(promiseList).then(function (lst) {
                deferred.resolve(wiList);
            });
            return deferred.promise();
        };
        WorkItemEninge.prototype.ReplaceParameters = function (template, parameterList) {
            if (template != null && template.templatedWorkItems != null) {
                template.templatedWorkItems.forEach(function (templateWI) {
                    templateWI.Type = ParamUtils.ReplaceParams(templateWI.Type, parameterList);
                    if (templateWI.CreateExpr != null && templateWI.CreateExpr != "") {
                        templateWI.CreateExpr = ParamUtils.ReplaceParams(templateWI.CreateExpr, parameterList);
                    }
                    templateWI.Fields.forEach(function (fld) {
                        if (fld.Value != "") {
                            fld.Value = ParamUtils.ReplaceParams(fld.Value, parameterList);
                        }
                    });
                });
            }
        };
        WorkItemEninge.prototype.BuildWorkItemsFromTemplate = function (template, parameterList, rootWI) {
            var urlBase = VSS.getWebContext().collection.uri + "/_apis/";
            var wiLst = [];
            var engine = this;
            if (template != null && template.templatedWorkItems != null) {
                template.templatedWorkItems.forEach(function (templateWI) {
                    var create = true;
                    engine.ReplaceParameters(template, parameterList);
                    if (templateWI.CreateExpr != null && templateWI.CreateExpr != "") {
                        create = eval(templateWI.CreateExpr);
                    }
                    if (create) {
                        var urlCreate = "wit/workitems/$" + templateWI.Type + "?api-version=1.0";
                        var title = "";
                        var msgBody = "[";
                        var msgParams = [];
                        templateWI.Fields.forEach(function (fld) {
                            if (fld.Field != "") {
                                var value = fld.Value;
                                if (fld.Field == "System.Title") {
                                    title = value;
                                }
                                if (fld.Field == "System.AreaPath") {
                                    value = VSS.getWebContext().project.name + "\\" + value;
                                }
                                if (fld.Field == "System.IterationPath") {
                                    value = VSS.getWebContext().project.name + "\\" + value;
                                }
                                msgParams.push({ "op": "add", "path": "/fields/" + fld.Field, "value": value });
                            }
                        });
                        var postCreateLinks = false;
                        if (templateWI.LinkType != "NONE" && templateWI.LinkType != "") {
                            var parentUrl = "";
                            if (templateWI.Parent == "root") {
                                parentUrl = rootWI.Url;
                                rootWI.linkedFromChild = true;
                                msgParams.push({
                                    "op": "add", "path": "/relations/-", "value": {
                                        "rel": templateWI.LinkType,
                                        "url": urlBase + parentUrl
                                    }
                                });
                            }
                            else {
                                postCreateLinks = true;
                            }
                        }
                        var doc = {
                            urlCreate: urlCreate,
                            param: msgParams,
                            type: templateWI.Type,
                            title: title,
                            color: Utilities.GetWorkItemColor(templateWI.Type),
                            postCreateLinks: postCreateLinks,
                            LinkType: templateWI.LinkType,
                            Parent: templateWI.Parent,
                            templateWorkItemId: templateWI.templateWorkItemId,
                            createdId: null,
                            createdUrl: null
                        };
                        wiLst.push(doc);
                    }
                });
            }
            return wiLst;
        };
        return WorkItemEninge;
    })();
    exports.WorkItemEninge = WorkItemEninge;
});
//# sourceMappingURL=WorkItemEngine.js.map