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

import DataContracts = require("../scripts/SampleDataContract");
import WorkClient = require("TFS/Work/RestClient");
import Contracts = require("TFS/Work/Contracts");
import CoreContracts = require("TFS/Core/Contracts");
import CoreClient = require("TFS/Core/RestClient");
import WitRestClient = require("TFS/WorkItemTracking/RestClient");

import ParamUtils = require("../scripts/ParamUtils");


export interface TeamsTemplate {
    teams: TeamTemplate[]
}

export interface TeamTemplate {
    Name: string;
    Description: string;
    DefaultTeamValue: string;
    TeamValues?: Contracts.TeamFieldValue[];
    TeamValuesField?: string;
    Iterations?: TeamIterationSettings;

    BacklogVisibility?: {
        [key: string]: boolean;
    };
    BugsBehavior?: Contracts.BugsBehavior;
    WorkingDays?: string[];
}

export interface TeamIterationSettings {
    RootIteration: string;
    Iterations?: string[];
}

export class TeamSampleDataService implements DataContracts.ISampleDataService {

    public WorkClient: WorkClient.WorkHttpClient2_2;
    public CoreClient: CoreClient.CoreHttpClient2_2;
    public WebContext: WebContext;

    public PopulateData(templateData: DataContracts.ISampleDataServiceTemplate, parameterList: ParamUtils.ITemplateParameter[] ): IPromise<DataContracts.ISampleDataServiceTemplate> {

        this.CoreClient = CoreClient.getClient();
        this.WorkClient = WorkClient.getClient();

        var defer = $.Deferred<DataContracts.ISampleDataServiceTemplate>();

        var template: TeamsTemplate = templateData.TemplateData;
        template.teams.forEach(t => {
            t.Name = ParamUtils.ReplaceParams(t.Name, parameterList);
        });


        this.PopulateTeams(templateData).then(nodes => {
            templateData.InstalledData = nodes;
            defer.resolve(templateData);
        },
            reject => {
                TelemetryClient.getClient().trackException(reject, "TeamSampleDataService.PopulateData");
                defer.reject(reject);
            });

        return defer.promise();

    }

    public RemoveData(installedData: DataContracts.ISampleDataServiceTemplate, parameterList: ParamUtils.ITemplateParameter[]): IPromise<DataContracts.ISampleDataServiceTemplate> {
        this.CoreClient = CoreClient.getClient();
        this.WorkClient = WorkClient.getClient();
      
        var deferred = $.Deferred<DataContracts.ISampleDataServiceTemplate>();
        var srv = this;

        if (installedData.InstalledData != null) {

            var promises = new Array<IPromise<void>>();

            installedData.InstalledData.forEach(team => {
                promises.push(srv.CoreClient.deleteTeam(this.WebContext.project.id, team.id));
            });

            Q.all(promises).then(
                data=> {
                    installedData.InstalledData = null;
                    deferred.resolve(installedData);
                },
                err=> {
                    TelemetryClient.getClient().trackException(err, "TeamSampleDataService.RemoveData");
                    deferred.reject(err)
                });
        }
        else {
            deferred.resolve(installedData);
        }
  
        return deferred.promise();
    }

    public PopulateTeams(templateData: DataContracts.ISampleDataServiceTemplate): IPromise<CoreContracts.WebApiTeam[]> {
        var defer = $.Deferred<CoreContracts.WebApiTeam[]>();
        var template : TeamsTemplate = templateData.TemplateData;

        

        this.CoreClient.getTeams(VSS.getWebContext().project.id).then(
            existingTeams=> {
                var promises = new Array<IPromise<CoreContracts.WebApiTeam>>();

                template.teams.forEach(team => {
                    var existingTeam = existingTeams.filter(t=> { return t.name == team.Name; });
                    if (existingTeam.length==0) {
                        promises.push(this.CreateTeam(team));
                    }
                    else {
                        promises.push(this.UpdateTeam(team, existingTeam[0] ));
                    }
                });

                Q.all(promises).then(nodes => {
                    defer.resolve(nodes.filter(n=> { return n != null; }));
                }, reject=> {
                    defer.reject(reject);
                });
            }
        );

        return defer.promise();
    }

  

    public CreateTeam(team: TeamTemplate): IPromise<CoreContracts.WebApiTeam> {
      
        var deferred = $.Deferred<CoreContracts.WebApiTeam>();

        var teamNode: any= {
            name: team.Name,
            description: team.Description
        };

        console.log("Creating Team " + team.Name);
        this.CoreClient.createTeam(teamNode, VSS.getWebContext().project.id).then(
            t=> {
                console.log("Successfully created team ");
                console.log(t);
                this.UpdateTeam(team, t).then(
                    data=> {
                        deferred.resolve(t);
                    },
                    err=> {
                        deferred.reject(err);
                    });

            },
            rejectReason => {
                console.log("Error creating team");
                TelemetryClient.getClient().trackException(rejectReason, "TeamSampleDataService.CreateTeam");
                deferred.reject(rejectReason);
           }
        );
    
        return deferred.promise();
    }

    public UpdateTeam(team: TeamTemplate, exitingTeam: CoreContracts.WebApiTeam) : IPromise<CoreContracts.WebApiTeam> {
        var deferred = $.Deferred<CoreContracts.WebApiTeam>();

        var promises: IPromise<any>[] = [];

  
        promises.push(this.SetTeamSettings(team, exitingTeam));
        if (team.TeamValues) {
            promises.push(this.SetTeamAreas(team, exitingTeam));
        }
        if (team.Iterations) {
            promises.push(this.SetTeamIterations(team, exitingTeam));
        }

        Q.all(promises).then(
            data=> {
                console.log("Success adding area to team " + team.Name);
                if (data.length > 2) {
                    console.log("Success adding Iterations to team " + team.Name);
                }
                deferred.resolve(null);

            },
            err=> {

                console.log("Failed adding areas or Iterations to team " + team.Name);
                TelemetryClient.getClient().trackException(err, "TeamSampleDataService.UpdateTeam");
                deferred.reject(err);
            });

        return deferred.promise();
    }

    public SetTeamAreas(team: TeamTemplate, createdTeamId: CoreContracts.WebApiTeam): IPromise<Contracts.TeamFieldValues> {
        var teamContext: any = {};
        teamContext.projectId = this.WebContext.project.id;
        teamContext.teamId = createdTeamId.id;

        var patch: Contracts.TeamFieldValuesPatch 
        var teamDefValue = team.DefaultTeamValue;
        if (team.TeamValuesField == null) {
            //If using areapath, assumes relative and add project name 
            teamDefValue = this.WebContext.project.name + "\\" + teamDefValue;
        }
        patch = {
            defaultValue: teamDefValue,
            values : []
        };

        team.TeamValues.forEach(t => {
            var teamValue = t.value;
            if (team.TeamValuesField == null) {
                //If using areapath, assumes relative and add project name 
                teamValue = this.WebContext.project.name + "\\" + t.value;
            }
            patch.values.push({ includeChildren: t.includeChildren, value: teamValue })
        });

        return this.WorkClient.updateTeamFieldValues(patch, teamContext);

    }

    public SetTeamSettings(team: TeamTemplate, createdTeamId: CoreContracts.WebApiTeam): IPromise<Contracts.TeamSetting> {
        var deferred = $.Deferred<Contracts.TeamSettingsIteration[]>();
        var teamContext: any = {};
        teamContext.projectId = this.WebContext.project.id;
        teamContext.teamId = createdTeamId.id;
        var projectRoot = VSS.getWebContext().project.name + "\\";

        var settings: any = {};

        if (team.BacklogVisibility) {
            settings["backlogVisibilities"] = team.BacklogVisibility;
        }
        if (team.BugsBehavior!=null) {
            settings["bugsBehavior"] = team.BugsBehavior;
        }
        if (team.WorkingDays) {
            settings["workingDays"] = team.WorkingDays;
        }

        return this.WorkClient.updateTeamSettings(settings, teamContext);
    }

    public SetTeamIterations(team: TeamTemplate, createdTeamId: CoreContracts.WebApiTeam): IPromise<Contracts.TeamSettingsIteration[]> {
        var deferred = $.Deferred<Contracts.TeamSettingsIteration[]>();
        var teamContext: any = {};
        teamContext.projectId = this.WebContext.project.id;
        teamContext.teamId = createdTeamId.id;

        
        var rootIteration = VSS.getWebContext().project.name;
        if (team.Iterations.RootIteration != "" && team.Iterations.RootIteration != "\\") {
            rootIteration = rootIteration + "\\" + team.Iterations.RootIteration;
        }

        var c = WitRestClient.getClient();
        c.getClassificationNode(VSS.getWebContext().project.name, 1, "",7).then(
            node=> {

                var rootIterationSettings: any = {
                    backlogIteration: Utilities.getNodeIdentifier([node], rootIteration)
                };

                this.WorkClient.updateTeamSettings(rootIterationSettings, teamContext).then(
                    settings=> {
                        console.log("Successfully set team BacklogIteration");

                        //var promisesIdFetch: IPromise<any>[] = [];
                        var promises: IPromise<Contracts.TeamSettingsIteration>[] = [];


                        if (team.Iterations.Iterations) {
                            var projectRoot = VSS.getWebContext().project.name;
                            team.Iterations.Iterations.forEach(iName=> {

                                var iteration: any = { path: projectRoot + "\\" + iName };
                                promises.push(this.WorkClient.postTeamIteration(iteration, teamContext));
                            });
                        }

                        Q.all(promises).then(
                            data=> {
                                deferred.resolve(data);
                            },
                            err=> {
                                TelemetryClient.getClient().trackException(err, "TeamSampleDataService.SetTeamIterations");
                                deferred.reject(err);
                            });
                    },
                    err=> {
                        deferred.reject(err);
                    });
            },
            err => {

            });

        return deferred.promise();

    }
}


