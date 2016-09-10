define(["require", "exports"], function (require, exports) {
    "use strict";
    var ClassificationNodeService = (function () {
        function ClassificationNodeService() {
        }
        ClassificationNodeService.prototype.CreateNodes = function (templateData, nodeType, parameterList) {
            var defer = $.Deferred();
            var template = templateData.TemplateData;
            var svc = this;
            this.WorkItemClient.getClassificationNode(VSS.getWebContext().project.name, nodeType, "", 7).then(function (rootNode) {
                var promises = new Array();
                template.nodes.forEach(function (node) {
                    promises.push(svc.CreateNodeStruct(node, nodeType, parameterList, [rootNode]));
                });
                Q.all(promises).then(function (nodes) {
                    defer.resolve(nodes);
                }, function (reject) {
                    TelemetryClient.getClient().trackException(reject, "ClassificationNodeService.CreateNodes");
                    defer.reject(reject);
                });
            }, function (reject) {
                defer.reject(reject);
            });
            return defer.promise();
        };
        ClassificationNodeService.prototype.CreateNodeStruct = function (nodeTemplate, nodeType, parameterList, existingNodes) {
            var _this = this;
            var deferred = $.Deferred();
            console.log("Creating Node " + nodeTemplate.Name);
            this.CreateOrUpdateNode(nodeTemplate, VSS.getWebContext().project.name, nodeType, Utilities.CleanTrailingSlash(nodeTemplate.Path), parameterList, existingNodes).then(function (node) {
                console.log("Successfully created node");
                console.log(node);
                if (nodeTemplate.Children != null) {
                    console.log("Creating child nodes to" + nodeTemplate.Name);
                    node.children = [];
                    var promises = [];
                    nodeTemplate.Children.forEach(function (child) {
                        promises.push(_this.CreateNodeStruct(child, nodeType, parameterList, existingNodes));
                    });
                    Q.all(promises).then(function (nodes) {
                        nodes.forEach(function (n) {
                            node.children.push(n);
                        });
                        deferred.resolve(node);
                    });
                }
                else {
                    deferred.resolve(node);
                }
            }, function (rejectReason) {
                TelemetryClient.getClient().trackException(rejectReason, "ClassificationNodeService.CreateNodeStruct");
                deferred.resolve(null);
            });
            return deferred.promise();
        };
        ClassificationNodeService.prototype.CreateOrUpdateNode = function (node, projectName, nodeType, path, parameterList, existingNodes) {
            var defer = $.Deferred();
            var nodePath = VSS.getWebContext().project.name + "\\";
            if (node.Path.length > 0) {
                nodePath = nodePath + node.Path + "\\";
            }
            var parentNodePath = Utilities.CleanTrailingSlash(nodePath);
            nodePath = nodePath + node.Name;
            var existingNode = Utilities.getNodeInTree(existingNodes, nodePath);
            var nodeToExecute = null;
            if (existingNode == null) {
                var newNode = {
                    name: node.Name,
                    structureType: nodeType,
                    attributes: this.ApplyAttributeMacros(node.Attributes, parameterList)
                };
                nodeToExecute = newNode;
            }
            else {
                nodeToExecute = existingNode;
                nodeToExecute.attributes = this.ApplyAttributeMacros(node.Attributes, parameterList);
            }
            this.WorkItemClient.createOrUpdateClassificationNode(nodeToExecute, projectName, nodeType, Utilities.CleanTrailingSlash(path)).then(function (node) {
                if (existingNode == null) {
                    var parentNode = Utilities.getNodeInTree(existingNodes, parentNodePath);
                    if (parentNode.children != null) {
                        parentNode.children = parentNode.children.concat(node);
                    }
                    else {
                        parentNode.children = [node];
                    }
                }
                defer.resolve(node);
                console.log("Successfully created node");
                console.log(node);
            }, function (err) {
                defer.reject(err);
            });
            return defer.promise();
        };
        ClassificationNodeService.prototype.RemoveNodes = function (context, templateData, nodeType) {
            var _this = this;
            var defer = $.Deferred();
            this.WorkItemClient.getClassificationNode(context.project.name, nodeType, "").then(function (rootNode) {
                var promises = [];
                templateData.InstalledData.forEach(function (node) {
                    if (node != null) {
                        var classification = node;
                        promises.push(_this.DeleteNode(context, classification, nodeType, rootNode.id, classification.name));
                    }
                });
                Q.all(promises).then(function (done) {
                    defer.resolve();
                }, function (reject) {
                    TelemetryClient.getClient().trackException(reject, "ClassificationNodeService.RemoveNodes");
                    defer.resolve();
                });
            });
            return defer.promise();
        };
        ClassificationNodeService.prototype.DeleteNode = function (context, classificationNode, nodeType, rootNode, path) {
            var _this = this;
            var defer = $.Deferred();
            if (classificationNode.children && classificationNode.children.length > 0) {
                var promises = [];
                classificationNode.children.forEach(function (child) {
                    promises.push(_this.DeleteNode(context, child, nodeType, rootNode, path + "\\" + child.name));
                });
                Q.all(promises).then(function (done) {
                    _this.WorkItemClient.deleteClassificationNode(context.project.name, nodeType, path, rootNode).then(function (done) {
                        defer.resolve();
                    }, function (failed) {
                        console.log(failed);
                        defer.resolve();
                    });
                }, function (reject) {
                    console.log(reject);
                    defer.resolve();
                });
            }
            else {
                this.WorkItemClient.deleteClassificationNode(context.project.name, nodeType, path, rootNode).then(function (done) {
                    defer.resolve();
                }, function (failed) {
                    console.log(failed);
                    defer.resolve();
                });
            }
            return defer.promise();
        };
        ClassificationNodeService.prototype.ApplyAttributeMacros = function (attributes, parameterList) {
            var knownAttributeKeys = ["startDate", "finishDate"];
            if (attributes) {
                knownAttributeKeys.forEach(function (attributeName) {
                    if (attributes[attributeName]) {
                        attributes[attributeName] = Utilities.ResolveDateMacro(attributes[attributeName], parameterList);
                    }
                });
            }
            return attributes;
        };
        return ClassificationNodeService;
    }());
    exports.ClassificationNodeService = ClassificationNodeService;
});
//# sourceMappingURL=ClassificationNode.js.map