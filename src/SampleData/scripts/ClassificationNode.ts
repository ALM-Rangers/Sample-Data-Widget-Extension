//---------------------------------------------------------------------
// <copyright file="ClassificationNode.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>
// </summary>
//---------------------------------------------------------------------
import DataContracts = require("../scripts/SampleDataContract");
import RestClient = require("TFS/WorkItemTracking/RestClient");
import Contracts = require("TFS/WorkItemTracking/Contracts");

import ParamUtils = require("../scripts/ParamUtils");


export interface ClassificationNodesTemplate {
    nodes: ClassificationNodeTemplate[]
}

export interface ICreateUpdateNode {
    created: boolean,
    node: Contracts.WorkItemClassificationNode 
}

export interface ClassificationNodeTemplate {
    Path: string;
    Name: string;
    Children: ClassificationNodeTemplate[];
    Attributes?: {
        [key: string]: any;
    };
}


export abstract class ClassificationNodeService {
    public WorkItemClient: RestClient.WorkItemTrackingHttpClient2_1;

    public CreateNodes( templateData: DataContracts.ISampleDataServiceTemplate, nodeType: Contracts.TreeStructureGroup, parameterList: ParamUtils.ITemplateParameter[]): IPromise<Contracts.WorkItemClassificationNode[]> {
        var defer = $.Deferred<Contracts.WorkItemClassificationNode[]>();
        var template: ClassificationNodesTemplate = templateData.TemplateData;
        var svc = this;

        
        this.WorkItemClient.getClassificationNode(VSS.getWebContext().project.name, nodeType, "", 7).then(rootNode=> {
            var promises = new Array<IPromise<ICreateUpdateNode>>();

            template.nodes.forEach(node => {
        
                promises.push(svc.CreateNodeStruct( node, nodeType, parameterList, [rootNode]));
            
            });

            Q.all(promises).then(nodes => {
                var addedNodes: Contracts.WorkItemClassificationNode[] = [];
                nodes.forEach(n => {
                    if (n.created) {
                        addedNodes.push(n.node);
                    }
                });
                defer.resolve(addedNodes)
            }, reject=> {
                TelemetryClient.getClient().trackException(reject, "ClassificationNodeService.CreateNodes");
                defer.reject(reject);
            });
        },
            reject=> {
                defer.reject(reject);
        });
        return defer.promise();
    }
    

    private CreateNodeStruct(nodeTemplate: ClassificationNodeTemplate, nodeType: Contracts.TreeStructureGroup, parameterList: ParamUtils.ITemplateParameter[], existingNodes: Contracts.WorkItemClassificationNode []): IPromise<ICreateUpdateNode> {
        var deferred = $.Deferred<ICreateUpdateNode>();

        console.log("Creating Node " + nodeTemplate.Name);

         
        this.CreateOrUpdateNode(nodeTemplate,
            VSS.getWebContext().project.name,
            nodeType,
            Utilities.CleanTrailingSlash(nodeTemplate.Path),
            parameterList,
            existingNodes).then(cuNode => {

            console.log("Successfully created node");
            console.log(cuNode);

            if (nodeTemplate.Children != null) {
                console.log("Creating child nodes to" + nodeTemplate.Name);
                cuNode.node.children = [];
                var promises: IPromise<ICreateUpdateNode>[] = [];
                nodeTemplate.Children.forEach(child => {
                    promises.push(this.CreateNodeStruct( child, nodeType, parameterList, existingNodes));
                });
                Q.all(promises).then(nodes => {
                    nodes.forEach(n=> {
                        cuNode.node.children.push(n.node);
                    });
                    deferred.resolve(cuNode);
                });
            }
            else {
                deferred.resolve(cuNode);
            }
        }, rejectReason => {
            TelemetryClient.getClient().trackException(rejectReason, "ClassificationNodeService.CreateNodeStruct");
            deferred.resolve(null);
        }); 

        return deferred.promise();
    }

    public CreateOrUpdateNode(node, projectName: string, nodeType, path: string, parameterList: ParamUtils.ITemplateParameter[], existingNodes: Contracts.WorkItemClassificationNode[]): IPromise<ICreateUpdateNode> {
        var defer = $.Deferred<ICreateUpdateNode>();


        var nodePath: string = VSS.getWebContext().project.name + "\\";
        if (node.Path.length > 0) {
            nodePath = nodePath + node.Path + "\\"
        }
        var parentNodePath = Utilities.CleanTrailingSlash(nodePath);
        nodePath = nodePath + node.Name;

        var existingNode = Utilities.getNodeInTree(existingNodes, nodePath);
        var nodeToExecute = null;
        if (existingNode == null){
            var newNode: any = {
                name: node.Name,
                structureType: nodeType,
                attributes: this.ApplyAttributeMacros(node.Attributes, parameterList)
            };
            nodeToExecute = newNode;
        }
        else{
            nodeToExecute = existingNode;
            nodeToExecute.attributes = this.ApplyAttributeMacros(node.Attributes, parameterList);

        }

        this.WorkItemClient.createOrUpdateClassificationNode(nodeToExecute, projectName, nodeType, Utilities.CleanTrailingSlash(path)).then(
            node => {
                if (existingNode==null) {
                    var parentNode: Contracts.WorkItemClassificationNode = Utilities.getNodeInTree(existingNodes, parentNodePath);
                    if (parentNode.children != null) {
                        parentNode.children = parentNode.children.concat(node);
                    }
                    else {
                        parentNode.children = [node];
                    }
                }
                defer.resolve({ created: existingNode == null, node: node });
                console.log("Successfully created node");
                console.log(node);
            },
            err=> {
                defer.reject(err);
            });

        return defer.promise();
    }

    public RemoveNodes(context: WebContext, templateData: DataContracts.ISampleDataServiceTemplate, nodeType: Contracts.TreeStructureGroup): IPromise<void> {
        var defer = $.Deferred<void>();
     
        this.WorkItemClient.getClassificationNode(context.project.name, nodeType, "").then(rootNode=> {

            var promises: IPromise<void>[] = [];

            templateData.InstalledData.forEach(node => {
                if (node != null) {
                    var classification: Contracts.WorkItemClassificationNode = node;
                    promises.push(this.DeleteNode(context, classification, nodeType, rootNode.id, classification.name));
                }
            });

            Q.all(promises).then(done=> {
                defer.resolve();
            }, reject=> {
                TelemetryClient.getClient().trackException(reject, "ClassificationNodeService.RemoveNodes");
                defer.resolve();
            });

        });
        return defer.promise();
    }

    public DeleteNode(context: WebContext, classificationNode: Contracts.WorkItemClassificationNode, nodeType: Contracts.TreeStructureGroup, rootNode: number, path : string): IPromise<void> {
        var defer = $.Deferred<void>();

        if (classificationNode.children && classificationNode.children.length > 0) {
            var promises: IPromise<void>[] = [];

            classificationNode.children.forEach(child => {
                promises.push(this.DeleteNode(context, child, nodeType, rootNode, path + "\\" + child.name));
            });

            Q.all(promises).then(done=> {
                this.WorkItemClient.deleteClassificationNode(context.project.name, nodeType, path, rootNode).then(done => {
                    defer.resolve();
                }, failed=> {
                    console.log(failed);
                    defer.resolve();
                });
            }, reject=> {
                console.log(reject);
                defer.resolve();
            });
        } else {
            this.WorkItemClient.deleteClassificationNode(context.project.name, nodeType, path, rootNode).then(done => {
                defer.resolve();
            }, failed=> {
                console.log(failed);
                defer.resolve();
            });
        }


        return defer.promise();
    }

    public ApplyAttributeMacros(attributes: { [key: string]: any; }, parameterList: ParamUtils.ITemplateParameter[]): any {
        var knownAttributeKeys = ["startDate", "finishDate"];
        if (attributes) {
            knownAttributeKeys.forEach(attributeName => {
                if (attributes[attributeName]) {
                    attributes[attributeName] = Utilities.ResolveDateMacro(attributes[attributeName], parameterList);
                }
            });
        }
        return attributes;
    }

}