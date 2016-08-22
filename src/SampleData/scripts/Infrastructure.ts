//---------------------------------------------------------------------
// <copyright file="Infrastructure.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>
// </summary>
//---------------------------------------------------------------------


/// <reference path="../sdk/jquery/jquery.d.ts" />



interface HashTable {
    [key: string]: any;
}

interface Action<T> {
    (item: T): void;
}

class Utilities {
    public static CleanTrailingSlash(nodePath: string): string {
        var path = nodePath;
        if (path.charAt(path.length - 1) == '\\') {
            path = path.substring(0, path.length - 1);
        }

        return path;
    }

    public static ResolveDateMacro(value: string, parameterList: any[]): string {

        var operators = [
            { Op: "+", Func: (left, right): number => { return left + right; } },
            { Op: "-", Func: (left, right) => { return left - right; } }
        ];

        var resolvedValue = value;

        parameterList.forEach(parameter => {
            if (resolvedValue.indexOf(parameter.Field) >= 0) {

                if ((parameter.Field == "@Today") && (resolvedValue.match(/@Today[ ]?[\+-]?[ ]?\d+/))) {
                    var date = new Date(Date.parse(parameter.Value));

                    operators.forEach(op => {
                        if (resolvedValue.indexOf(op.Op) >= 0) {
                            var sections = resolvedValue.split(op.Op);
                            date.setDate(op.Func(date.getDate(), parseInt(sections[1])));
                        }
                    });
                    resolvedValue = date.toJSON();
                } else {
                    //straight up substitution
                    resolvedValue = resolvedValue.replace(parameter.Field, parameter.Value);
                }
            }
        });

        return resolvedValue;
    }

    public static getNodeIdentifier(nodes: any[], path: string) {
        var n = Utilities.getNodeInTree(nodes, path);
        if (n == null) {
            return null;
        }
        else {
            return n.identifier;
        }
    }

    public static getNodeInTree(nodes: any[], path: string): any {
        if (path.indexOf("\\") >= 0) {
            var nodeName = path.substr(0, path.indexOf("\\"));
            var nodes = nodes.filter(n => {
                return n.name == nodeName;
            })
            var childPath = path.substr(path.indexOf("\\") + 1);
            if (nodes.length > 0) {
                if (nodes[0].children == null) {
                    return null;
                }
                else {
                    return Utilities.getNodeInTree(nodes[0].children, childPath);
                }
            }
            else {
                return null;
            }
        }
        else {
            var nodelst = nodes.filter(n=> { return n.name == path; });
            if (nodelst.length > 0) {
                return nodelst[0];
            }
            else {
                return null;
            }
        }
    }



    static workItemTypeColors = [
        { "PrimaryColor": "CC293D", "SecondaryColor": "FFFAEAE5", "WorkItemTypeName": "Bug" },
        { "PrimaryColor": "FFFF9D00", "SecondaryColor": "FFFCEECF", "WorkItemTypeName": "Code Review Request" },
        { "PrimaryColor": "FFFF9D00", "SecondaryColor": "FFFCEECF", "WorkItemTypeName": "Code Review Response" },
        { "PrimaryColor": "FF773B93", "SecondaryColor": "FFEEE2F2", "WorkItemTypeName": "Feature" },
        { "PrimaryColor": "FFFF9D00", "SecondaryColor": "FFFCEECF", "WorkItemTypeName": "Feedback Request" },
        { "PrimaryColor": "FFFF9D00", "SecondaryColor": "FFFCEECF", "WorkItemTypeName": "Feedback Response" },
        { "PrimaryColor": "FFFF9D00", "SecondaryColor": "FFFCEECF", "WorkItemTypeName": "Issue" },
        { "PrimaryColor": "FFFF9D00", "SecondaryColor": "FFFCEECF", "WorkItemTypeName": "Scenario" },
        { "PrimaryColor": "FFFF9D00", "SecondaryColor": "FFFCEECF", "WorkItemTypeName": "Shared Steps" },
        { "PrimaryColor": "FFD800", "SecondaryColor": "FFF6F5D2", "WorkItemTypeName": "Task" },
        { "PrimaryColor": "FFFF9D00", "SecondaryColor": "FFFCEECF", "WorkItemTypeName": "Test Case" },
        { "PrimaryColor": "009CCC", "SecondaryColor": "FFD6ECF2", "WorkItemTypeName": "User Story" },
        { "PrimaryColor": "009CCC", "SecondaryColor": "FFD6ECF2", "WorkItemTypeName": "Product Backlog Item" }];


    public static GetWorkItemColor(type) {
        var color = 'FFF2CB1D';
        Utilities.workItemTypeColors.forEach(function (wit) {
            if (wit.WorkItemTypeName == type) {
                color = wit.PrimaryColor;
            }
        });
        return "#" + color;
    }
} 
