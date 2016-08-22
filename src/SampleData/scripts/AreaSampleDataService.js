//---------------------------------------------------------------------
// <copyright file="AreaSampleDataService.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>
// </summary>
//---------------------------------------------------------------------
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
define(["require", "exports", "../scripts/ClassificationNode", "TFS/WorkItemTracking/Contracts"], function (require, exports, Nodes, Contracts) {
    var AreaSampleDataService = (function (_super) {
        __extends(AreaSampleDataService, _super);
        function AreaSampleDataService() {
            _super.apply(this, arguments);
        }
        AreaSampleDataService.prototype.PopulateData = function (templateData, parameterList) {
            var defer = $.Deferred();
            this.CreateNodes(templateData, 0, parameterList).then(function (nodes) {
                templateData.InstalledData = nodes;
                defer.resolve(templateData);
            }, function (reject) {
                TelemetryClient.getClient().trackException(reject, "AreaSampleDataService.PopulateData");
                console.log(reject);
                defer.reject(reject);
            });
            return defer.promise();
        };
        AreaSampleDataService.prototype.RemoveData = function (installedData, parameterList) {
            var defer = $.Deferred();
            if (installedData.InstalledData != null) {
                this.RemoveNodes(this.WebContext, installedData, Contracts.TreeStructureGroup.Areas).then(function (reply) {
                    installedData.InstalledData = null;
                    defer.resolve(installedData);
                });
            }
            else {
                defer.resolve(installedData.InstalledData);
            }
            return defer.promise();
        };
        return AreaSampleDataService;
    })(Nodes.ClassificationNodeService);
    exports.AreaSampleDataService = AreaSampleDataService;
});
//# sourceMappingURL=AreaSampleDataService.js.map