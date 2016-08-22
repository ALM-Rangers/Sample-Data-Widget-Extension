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

import DataContracts = require("../scripts/SampleDataContract");
import WorkClient = require("TFS/Work/RestClient");
import Contracts = require("TFS/Work/Contracts");
import WebContracts = require("VSS/WebApi/Contracts");
import WITClient = require("TFS/WorkItemTracking/RestClient");
import WITContracts = require("TFS/WorkItemTracking/Contracts");
import CoreContracts = require("TFS/Core/Contracts");
import CoreClient = require("TFS/Core/RestClient");

import ParamUtils = require("../scripts/ParamUtils");

export interface TeamCapcitiesTemplate {
    teamSprintCapacities: TeamCapacityTemplate[]
}

export interface TeamMemberActivity {
    MemberName: string;
    Activities: Contracts.Activity[]
    DaysOf?: Contracts.DateRange[];
}

export interface TeamCapacityTemplate {
    TeamName: string;
    Iteration: string;
    MemberActivity: TeamMemberActivity[];

}

export class TeamCapacitySampleDataService implements DataContracts.ISampleDataService {

    public WorkClient: WorkClient.WorkHttpClient2_2;
    public CoreClient: CoreClient.CoreHttpClient2_2;
    public WebContext: WebContext;

    private teamIterationsArray: Array<Contracts.TeamSettingsIteration[]>;
    private memberLst: WebContracts.IdentityRef[];


    public PopulateData(templateData: DataContracts.ISampleDataServiceTemplate, parameterList: ParamUtils.ITemplateParameter[]): IPromise<DataContracts.ISampleDataServiceTemplate> {

        this.CoreClient = CoreClient.getClient();
        this.WorkClient = WorkClient.getClient();

        var defer = $.Deferred<DataContracts.ISampleDataServiceTemplate>();
        var template: TeamCapcitiesTemplate = templateData.TemplateData;

        var srv = this;

        this.ReplaceParamsInTempalte(template, parameterList);

        var iterations: IPromise<Array<Contracts.TeamSettingsIteration[]>> = this.getTeamsIterations();
        var members: IPromise<WebContracts.IdentityRef[]> = this.getTeamMemberLst(template);

        var promises: IPromise<any>[] = [iterations, members]


        Q.all(promises).then(
            data=> {
                srv.teamIterationsArray = data[0];
                srv.memberLst = data[1];

                srv.UpdateCapacity(template).then(nodes => {
                    templateData.InstalledData = nodes;
                    defer.resolve(templateData);
                },
                    reject => {
                        console.log(reject);
                        defer.reject(reject);
                    });


            },
            err=> {
                TelemetryClient.getClient().trackException(err, "TeamCapacitySampleDataService.PopulateData");
            });



        return defer.promise();

    }


    private ReplaceParamsInTempalte(template: TeamCapcitiesTemplate, parameterList: ParamUtils.ITemplateParameter[]) {

        template.teamSprintCapacities.forEach(tpc => {
            tpc.TeamName = ParamUtils.ReplaceParams(tpc.TeamName, parameterList);
            tpc.Iteration = ParamUtils.ReplaceParams(tpc.Iteration, parameterList);
            tpc.MemberActivity.forEach(tmc => {
                tmc.MemberName = ParamUtils.ReplaceParams(tmc.MemberName, parameterList);
            });
        });
    }




    public RemoveData(installedData: DataContracts.ISampleDataServiceTemplate, parameterList: ParamUtils.ITemplateParameter[]): IPromise<DataContracts.ISampleDataServiceTemplate> {
        this.CoreClient = CoreClient.getClient();
        this.WorkClient = WorkClient.getClient();

        var deferred = $.Deferred<DataContracts.ISampleDataServiceTemplate>();
        var srv = this;

        if (installedData.InstalledData != null) {

            var promises = new Array<IPromise<void>>();

            installedData.InstalledData.forEach(team => {


                // promises.push(srv.CoreClient.deleteTeam(this.WebContext.project.id, team.id));
            });

            Q.all(promises).then(
                data=> {
                    installedData.InstalledData = null;
                    deferred.resolve(installedData);
                },
                err=> {
                    TelemetryClient.getClient().trackException(err, "TeamCapacitySampleDataService.RemoveData");
                    deferred.reject(err)
                });
        }
        else {
            deferred.resolve(installedData);
        }
        return deferred.promise();
    }


    public UpdateCapacity(template: TeamCapcitiesTemplate): IPromise<Contracts.TeamMemberCapacity[]> {
        var defer = $.Deferred<Contracts.TeamMemberCapacity[]>();

        var promises = new Array<IPromise<Contracts.TeamMemberCapacity[]>>();
        template.teamSprintCapacities.forEach(tpc => {
            promises.push(this.SetTeamCapacity(tpc));
        });


        Q.all(promises).then(nodes => {
            var lst: Contracts.TeamMemberCapacity[] = [];
            nodes.forEach(n=> {
                lst = lst.concat(n);
            });
            defer.resolve(lst);
        }, reject=> {
            TelemetryClient.getClient().trackException(reject, "TeamCapacitySampleDataService.UpdateCapacity");
            defer.reject(reject);
        });

        return defer.promise();
    }



    public SetTeamCapacity(teamCapacity: TeamCapacityTemplate): IPromise<Contracts.TeamMemberCapacity[]> {

        var deferred = $.Deferred<Contracts.TeamMemberCapacity[]>();
        var x: CoreContracts.TeamContext;

        var svc = this;
        var teamContext: any = {
            name: teamCapacity.TeamName,
            project: VSS.getWebContext().project.name,
        };

        teamCapacity.Iteration = VSS.getWebContext().project.name + "\\" + teamCapacity.Iteration;

        var prms: IPromise<Contracts.TeamMemberCapacity>[] = [];

        teamCapacity.MemberActivity.forEach(tmc => {
            var patch: Contracts.CapacityPatch = {
                daysOff: tmc.DaysOf,
                activities: tmc.Activities,
            };

            console.log("Updating  Team capacity" + teamCapacity.TeamName + " member " + tmc.MemberName);

            prms.push(svc.WorkClient.updateCapacity(patch, teamContext, svc.GetTeamIterationId(teamCapacity.TeamName, teamCapacity.Iteration), svc.GetTeamMemberId(tmc.MemberName)));
            console.log("Added call");


        });

        Q.all(prms).then(
            data=> {
                console.log("Done updating all capacity");
                deferred.resolve(data);
            },
            err=> {
                console.log("Error updating all capacity");
                TelemetryClient.getClient().trackException(err, "TeamCapacitySampleDataService.SetTeamCapacity");
                deferred.reject(err);
            });

        return deferred.promise();
    }

    public GetTeamIterationId(teamName: string, path: string): string {

        var l: Contracts.TeamSettingsIteration[] = this.teamIterationsArray[teamName].filter(i=> {
            return i.path == path;
        });
        var retVal = "";
        if (l.length > 0) {
            retVal = l[0].id;
        }
        return retVal;
    }

    private getTeamsIterations(): IPromise<Array<Contracts.TeamSettingsIteration[]>> {

        var deferred = $.Deferred<Array<Contracts.TeamSettingsIteration[]>>();
        var srv = this;



        this.CoreClient.getTeams(VSS.getWebContext().project.id).then(
            teams=> {
                var prms: IPromise<Contracts.TeamSettingsIteration[]>[] = [];

                teams.forEach(t=> {

                    var teamContext: any = {
                        name: t.name,
                        project: VSS.getWebContext().project.name
                    };

                    prms.push(srv.WorkClient.getTeamIterations(teamContext))
                });

                Q.all(prms).then(
                    data=> {
                        var lst: Array<Contracts.TeamSettingsIteration[]> = new Array<Contracts.TeamSettingsIteration[]>();

                        for (var i = 0; i < data.length; i++) {
                            lst[teams[i].name] = data[i];
                        }

                        deferred.resolve(lst);
                    }, err=> {
                        deferred.reject(err);
                    });
            },
            err=> {
                deferred.reject(err);
            });


        return deferred.promise();
    }

    public GetTeamMemberId(memberName: string): string {
        return this.memberLst.filter(m=> { return m.displayName == memberName; })[0].id;
    }

    public getTeamMemberLst(teams: TeamCapcitiesTemplate): IPromise<WebContracts.IdentityRef[]> {

        var deferred = $.Deferred<WebContracts.IdentityRef[]>();
        var x: CoreContracts.TeamContext;
        var srv = this;


        this.CoreClient.getTeams(VSS.getWebContext().project.id).then(
            teams=> {
                var prms: IPromise<WebContracts.IdentityRef[]>[] = [];

                teams.forEach(t=> {
                    prms.push(srv.CoreClient.getTeamMembers(VSS.getWebContext().project.id, t.id));
                });

                Q.all(prms).then(
                    data=> {
                        var totalList: WebContracts.IdentityRef[] = [];

                        data.forEach(identities=> {
                            totalList = totalList.concat(identities);
                        });

                        deferred.resolve(totalList);
                    }, err=> {
                        deferred.reject(err);
                    });
            },
            err=> {
                deferred.reject(err);
            });


        return deferred.promise();
    }


}


