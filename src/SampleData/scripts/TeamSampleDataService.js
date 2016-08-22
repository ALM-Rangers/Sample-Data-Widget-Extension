//---------------------------------------------------------------------
// <copyright file="TeamSampleDataService.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>
// </summary>
//---------------------------------------------------------------------
define(["require", "exports", "TFS/Work/RestClient", "TFS/Core/RestClient", "TFS/WorkItemTracking/RestClient", "../scripts/ParamUtils"], function (require, exports, WorkClient, CoreClient, WitRestClient, ParamUtils) {
    var TeamSampleDataService = (function () {
        function TeamSampleDataService() {
        }
        TeamSampleDataService.prototype.PopulateData = function (templateData, parameterList) {
            this.CoreClient = CoreClient.getClient();
            this.WorkClient = WorkClient.getClient();
            var defer = $.Deferred();
            var template = templateData.TemplateData;
            template.teams.forEach(function (t) {
                t.Name = ParamUtils.ReplaceParams(t.Name, parameterList);
            });
            this.PopulateTeams(templateData).then(function (nodes) {
                templateData.InstalledData = nodes;
                defer.resolve(templateData);
            }, function (reject) {
                TelemetryClient.getClient().trackException(reject, "TeamSampleDataService.PopulateData");
                defer.reject(reject);
            });
            return defer.promise();
        };
        TeamSampleDataService.prototype.RemoveData = function (installedData, parameterList) {
            var _this = this;
            this.CoreClient = CoreClient.getClient();
            this.WorkClient = WorkClient.getClient();
            var deferred = $.Deferred();
            var srv = this;
            if (installedData.InstalledData != null) {
                var promises = new Array();
                installedData.InstalledData.forEach(function (team) {
                    promises.push(srv.CoreClient.deleteTeam(_this.WebContext.project.id, team.id));
                });
                Q.all(promises).then(function (data) {
                    installedData.InstalledData = null;
                    deferred.resolve(installedData);
                }, function (err) {
                    TelemetryClient.getClient().trackException(err, "TeamSampleDataService.RemoveData");
                    deferred.reject(err);
                });
            }
            else {
                deferred.resolve(installedData);
            }
            return deferred.promise();
        };
        TeamSampleDataService.prototype.PopulateTeams = function (templateData) {
            var _this = this;
            var defer = $.Deferred();
            var template = templateData.TemplateData;
            this.CoreClient.getTeams(VSS.getWebContext().project.id).then(function (existingTeams) {
                var promises = new Array();
                template.teams.forEach(function (team) {
                    var existingTeam = existingTeams.filter(function (t) { return t.name == team.Name; });
                    if (existingTeam.length == 0) {
                        promises.push(_this.CreateTeam(team));
                    }
                    else {
                        promises.push(_this.UpdateTeam(team, existingTeam[0]));
                    }
                });
                Q.all(promises).then(function (nodes) {
                    defer.resolve(nodes.filter(function (n) { return n != null; }));
                }, function (reject) {
                    defer.reject(reject);
                });
            });
            return defer.promise();
        };
        TeamSampleDataService.prototype.CreateTeam = function (team) {
            var _this = this;
            var deferred = $.Deferred();
            var teamNode = {
                name: team.Name,
                description: team.Description
            };
            console.log("Creating Team " + team.Name);
            this.CoreClient.createTeam(teamNode, VSS.getWebContext().project.id).then(function (t) {
                console.log("Successfully created team ");
                console.log(t);
                _this.UpdateTeam(team, t).then(function (data) {
                    deferred.resolve(t);
                }, function (err) {
                    deferred.reject(err);
                });
            }, function (rejectReason) {
                console.log("Error creating team");
                TelemetryClient.getClient().trackException(rejectReason, "TeamSampleDataService.CreateTeam");
                deferred.reject(rejectReason);
            });
            return deferred.promise();
        };
        TeamSampleDataService.prototype.UpdateTeam = function (team, exitingTeam) {
            var deferred = $.Deferred();
            var promises = [];
            promises.push(this.SetTeamSettings(team, exitingTeam));
            if (team.TeamValues) {
                promises.push(this.SetTeamAreas(team, exitingTeam));
            }
            if (team.Iterations) {
                promises.push(this.SetTeamIterations(team, exitingTeam));
            }
            Q.all(promises).then(function (data) {
                console.log("Success adding area to team " + team.Name);
                if (data.length > 2) {
                    console.log("Success adding Iterations to team " + team.Name);
                }
                deferred.resolve(null);
            }, function (err) {
                console.log("Failed adding areas or Iterations to team " + team.Name);
                TelemetryClient.getClient().trackException(err, "TeamSampleDataService.UpdateTeam");
                deferred.reject(err);
            });
            return deferred.promise();
        };
        TeamSampleDataService.prototype.SetTeamAreas = function (team, createdTeamId) {
            var _this = this;
            var teamContext = {};
            teamContext.projectId = this.WebContext.project.id;
            teamContext.teamId = createdTeamId.id;
            var patch;
            var teamDefValue = team.DefaultTeamValue;
            if (team.TeamValuesField == null) {
                //If using areapath, assumes relative and add project name 
                teamDefValue = this.WebContext.project.name + "\\" + teamDefValue;
            }
            patch = {
                defaultValue: teamDefValue,
                values: []
            };
            team.TeamValues.forEach(function (t) {
                var teamValue = t.value;
                if (team.TeamValuesField == null) {
                    //If using areapath, assumes relative and add project name 
                    teamValue = _this.WebContext.project.name + "\\" + t.value;
                }
                patch.values.push({ includeChildren: t.includeChildren, value: teamValue });
            });
            return this.WorkClient.updateTeamFieldValues(patch, teamContext);
        };
        TeamSampleDataService.prototype.SetTeamSettings = function (team, createdTeamId) {
            var deferred = $.Deferred();
            var teamContext = {};
            teamContext.projectId = this.WebContext.project.id;
            teamContext.teamId = createdTeamId.id;
            var projectRoot = VSS.getWebContext().project.name + "\\";
            var settings = {};
            if (team.BacklogVisibility) {
                settings["backlogVisibilities"] = team.BacklogVisibility;
            }
            if (team.BugsBehavior != null) {
                settings["bugsBehavior"] = team.BugsBehavior;
            }
            if (team.WorkingDays) {
                settings["workingDays"] = team.WorkingDays;
            }
            return this.WorkClient.updateTeamSettings(settings, teamContext);
        };
        TeamSampleDataService.prototype.SetTeamIterations = function (team, createdTeamId) {
            var _this = this;
            var deferred = $.Deferred();
            var teamContext = {};
            teamContext.projectId = this.WebContext.project.id;
            teamContext.teamId = createdTeamId.id;
            var rootIteration = VSS.getWebContext().project.name;
            if (team.Iterations.RootIteration != "" && team.Iterations.RootIteration != "\\") {
                rootIteration = rootIteration + "\\" + team.Iterations.RootIteration;
            }
            var c = WitRestClient.getClient();
            c.getClassificationNode(VSS.getWebContext().project.name, 1, "", 7).then(function (node) {
                var rootIterationSettings = {
                    backlogIteration: Utilities.getNodeIdentifier([node], rootIteration)
                };
                _this.WorkClient.updateTeamSettings(rootIterationSettings, teamContext).then(function (settings) {
                    console.log("Successfully set team BacklogIteration");
                    //var promisesIdFetch: IPromise<any>[] = [];
                    var promises = [];
                    if (team.Iterations.Iterations) {
                        var projectRoot = VSS.getWebContext().project.name;
                        team.Iterations.Iterations.forEach(function (iName) {
                            var iteration = { path: projectRoot + "\\" + iName };
                            promises.push(_this.WorkClient.postTeamIteration(iteration, teamContext));
                        });
                    }
                    Q.all(promises).then(function (data) {
                        deferred.resolve(data);
                    }, function (err) {
                        TelemetryClient.getClient().trackException(err, "TeamSampleDataService.SetTeamIterations");
                        deferred.reject(err);
                    });
                }, function (err) {
                    deferred.reject(err);
                });
            }, function (err) {
            });
            return deferred.promise();
        };
        return TeamSampleDataService;
    })();
    exports.TeamSampleDataService = TeamSampleDataService;
});
//# sourceMappingURL=TeamSampleDataService.js.map