//---------------------------------------------------------------------
// <copyright file="TeamCapacitySampleDataService.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>
// </summary>
//---------------------------------------------------------------------
define(["require", "exports", "TFS/Work/RestClient", "TFS/Core/RestClient", "../scripts/ParamUtils"], function (require, exports, WorkClient, CoreClient, ParamUtils) {
    var TeamCapacitySampleDataService = (function () {
        function TeamCapacitySampleDataService() {
        }
        TeamCapacitySampleDataService.prototype.PopulateData = function (templateData, parameterList) {
            this.CoreClient = CoreClient.getClient();
            this.WorkClient = WorkClient.getClient();
            var defer = $.Deferred();
            var template = templateData.TemplateData;
            var srv = this;
            this.ReplaceParamsInTempalte(template, parameterList);
            var iterations = this.getTeamsIterations();
            var members = this.getTeamMemberLst(template);
            var promises = [iterations, members];
            Q.all(promises).then(function (data) {
                srv.teamIterationsArray = data[0];
                srv.memberLst = data[1];
                srv.UpdateCapacity(template).then(function (nodes) {
                    templateData.InstalledData = nodes;
                    defer.resolve(templateData);
                }, function (reject) {
                    console.log(reject);
                    defer.reject(reject);
                });
            }, function (err) {
                TelemetryClient.getClient().trackException(err, "TeamCapacitySampleDataService.PopulateData");
            });
            return defer.promise();
        };
        TeamCapacitySampleDataService.prototype.ReplaceParamsInTempalte = function (template, parameterList) {
            template.teamSprintCapacities.forEach(function (tpc) {
                tpc.TeamName = ParamUtils.ReplaceParams(tpc.TeamName, parameterList);
                tpc.Iteration = ParamUtils.ReplaceParams(tpc.Iteration, parameterList);
                tpc.MemberActivity.forEach(function (tmc) {
                    tmc.MemberName = ParamUtils.ReplaceParams(tmc.MemberName, parameterList);
                });
            });
        };
        TeamCapacitySampleDataService.prototype.RemoveData = function (installedData, parameterList) {
            this.CoreClient = CoreClient.getClient();
            this.WorkClient = WorkClient.getClient();
            var deferred = $.Deferred();
            var srv = this;
            if (installedData.InstalledData != null) {
                var promises = new Array();
                installedData.InstalledData.forEach(function (team) {
                    // promises.push(srv.CoreClient.deleteTeam(this.WebContext.project.id, team.id));
                });
                Q.all(promises).then(function (data) {
                    installedData.InstalledData = null;
                    deferred.resolve(installedData);
                }, function (err) {
                    TelemetryClient.getClient().trackException(err, "TeamCapacitySampleDataService.RemoveData");
                    deferred.reject(err);
                });
            }
            else {
                deferred.resolve(installedData);
            }
            return deferred.promise();
        };
        TeamCapacitySampleDataService.prototype.UpdateCapacity = function (template) {
            var _this = this;
            var defer = $.Deferred();
            var promises = new Array();
            template.teamSprintCapacities.forEach(function (tpc) {
                promises.push(_this.SetTeamCapacity(tpc));
            });
            Q.all(promises).then(function (nodes) {
                var lst = [];
                nodes.forEach(function (n) {
                    lst = lst.concat(n);
                });
                defer.resolve(lst);
            }, function (reject) {
                TelemetryClient.getClient().trackException(reject, "TeamCapacitySampleDataService.UpdateCapacity");
                defer.reject(reject);
            });
            return defer.promise();
        };
        TeamCapacitySampleDataService.prototype.SetTeamCapacity = function (teamCapacity) {
            var deferred = $.Deferred();
            var x;
            var svc = this;
            var teamContext = {
                name: teamCapacity.TeamName,
                project: VSS.getWebContext().project.name
            };
            teamCapacity.Iteration = VSS.getWebContext().project.name + "\\" + teamCapacity.Iteration;
            var prms = [];
            teamCapacity.MemberActivity.forEach(function (tmc) {
                var patch = {
                    daysOff: tmc.DaysOf,
                    activities: tmc.Activities
                };
                console.log("Updating  Team capacity" + teamCapacity.TeamName + " member " + tmc.MemberName);
                prms.push(svc.WorkClient.updateCapacity(patch, teamContext, svc.GetTeamIterationId(teamCapacity.TeamName, teamCapacity.Iteration), svc.GetTeamMemberId(tmc.MemberName)));
                console.log("Added call");
            });
            Q.all(prms).then(function (data) {
                console.log("Done updating all capacity");
                deferred.resolve(data);
            }, function (err) {
                console.log("Error updating all capacity");
                TelemetryClient.getClient().trackException(err, "TeamCapacitySampleDataService.SetTeamCapacity");
                deferred.reject(err);
            });
            return deferred.promise();
        };
        TeamCapacitySampleDataService.prototype.GetTeamIterationId = function (teamName, path) {
            var l = this.teamIterationsArray[teamName].filter(function (i) {
                return i.path == path;
            });
            var retVal = "";
            if (l.length > 0) {
                retVal = l[0].id;
            }
            return retVal;
        };
        TeamCapacitySampleDataService.prototype.getTeamsIterations = function () {
            var deferred = $.Deferred();
            var srv = this;
            this.CoreClient.getTeams(VSS.getWebContext().project.id).then(function (teams) {
                var prms = [];
                teams.forEach(function (t) {
                    var teamContext = {
                        name: t.name,
                        project: VSS.getWebContext().project.name
                    };
                    prms.push(srv.WorkClient.getTeamIterations(teamContext));
                });
                Q.all(prms).then(function (data) {
                    var lst = new Array();
                    for (var i = 0; i < data.length; i++) {
                        lst[teams[i].name] = data[i];
                    }
                    deferred.resolve(lst);
                }, function (err) {
                    deferred.reject(err);
                });
            }, function (err) {
                deferred.reject(err);
            });
            return deferred.promise();
        };
        TeamCapacitySampleDataService.prototype.GetTeamMemberId = function (memberName) {
            return this.memberLst.filter(function (m) { return m.displayName == memberName; })[0].id;
        };
        TeamCapacitySampleDataService.prototype.getTeamMemberLst = function (teams) {
            var deferred = $.Deferred();
            var x;
            var srv = this;
            this.CoreClient.getTeams(VSS.getWebContext().project.id).then(function (teams) {
                var prms = [];
                teams.forEach(function (t) {
                    prms.push(srv.CoreClient.getTeamMembers(VSS.getWebContext().project.id, t.id));
                });
                Q.all(prms).then(function (data) {
                    var totalList = [];
                    data.forEach(function (identities) {
                        totalList = totalList.concat(identities);
                    });
                    deferred.resolve(totalList);
                }, function (err) {
                    deferred.reject(err);
                });
            }, function (err) {
                deferred.reject(err);
            });
            return deferred.promise();
        };
        return TeamCapacitySampleDataService;
    })();
    exports.TeamCapacitySampleDataService = TeamCapacitySampleDataService;
});
//# sourceMappingURL=TeamCapacitySampleDataService.js.map