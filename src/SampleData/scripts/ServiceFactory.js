//---------------------------------------------------------------------
// <copyright file="ServiceFactory.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>
// </summary>
//---------------------------------------------------------------------
define(["require", "exports", "TFS/WorkItemTracking/RestClient", "../scripts/WorkItemSampleDataService", "../scripts/IterationSampleDataService", "../scripts/TeamSampleDataService", "../scripts/TeamCapacitySampleDataService", "../scripts/AreaSampleDataService", "../scripts/BoardSettingsSampleDataService"], function (require, exports, RestClient, WITSampleDataService, IterationDataService, TeamDataService, TeamCapacityDataService, AreaDataService, BoardSettingDataService) {
    var ServiceFactory = (function () {
        function ServiceFactory() {
        }
        ServiceFactory.prototype.getService = function (name) {
            switch (name) {
                case "WorkItemSampleDataService":
                    return new WITSampleDataService.WorkItemSampleDataService();
                case "IterationSampleDataService":
                    var iterationService = new IterationDataService.IterationSampleDataService();
                    iterationService.WebContext = VSS.getWebContext();
                    iterationService.WorkItemClient = RestClient.getClient();
                    return iterationService;
                case "AreaSampleDataService":
                    var areaService = new AreaDataService.AreaSampleDataService();
                    areaService.WebContext = VSS.getWebContext();
                    areaService.WorkItemClient = RestClient.getClient();
                    return areaService;
                case "TeamSampleDataService":
                    var teamService = new TeamDataService.TeamSampleDataService();
                    teamService.WebContext = VSS.getWebContext();
                    return teamService;
                case "TeamCapacitySampleDataService":
                    var teamCapacityService = new TeamCapacityDataService.TeamCapacitySampleDataService();
                    teamCapacityService.WebContext = VSS.getWebContext();
                    return teamCapacityService;
                case "BoardSettingSampleDataService":
                    var boardSettingService = new BoardSettingDataService.BoardSettingsSampleDataService();
                    boardSettingService.WebContext = VSS.getWebContext();
                    return boardSettingService;
            }
            return null;
        };
        return ServiceFactory;
    })();
    exports.ServiceFactory = ServiceFactory;
});
//# sourceMappingURL=ServiceFactory.js.map