//---------------------------------------------------------------------
// <copyright file="BoardSettingsSampleDataService.ts">
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

import ParamUtils = require("../scripts/ParamUtils");

export interface BoardSettingsTemplate {
    BoardName: string;
    TeamName: string;
    CardSettings: Contracts.BoardCardSettings;
    CardRules: Contracts.BoardCardRuleSettings;
    Columns?: Contracts.BoardColumn[];
}



export class BoardSettingsSampleDataService implements DataContracts.ISampleDataService {

    public WorkClient: WorkClient.WorkHttpClient2_2;
    public CoreClient: CoreClient.CoreHttpClient2_2;
    public WebContext: WebContext;

    public PopulateData(template: DataContracts.ISampleDataServiceTemplate, parameterList: ParamUtils.ITemplateParameter[]): IPromise<DataContracts.ISampleDataServiceTemplate> {

        this.CoreClient = CoreClient.getClient();
        this.WorkClient = WorkClient.getClient();
        var srv = this;
        var defer = $.Deferred<DataContracts.ISampleDataServiceTemplate>();
        var tmplData: BoardSettingsTemplate = template.TemplateData;

        tmplData.TeamName = ParamUtils.ReplaceParams(tmplData.TeamName, parameterList);
        tmplData.BoardName = ParamUtils.ReplaceParams(tmplData.BoardName, parameterList);

        if (tmplData.CardSettings != null) {
            var cards = tmplData.CardSettings.cards;

            for (var p in cards) {
                if (cards.hasOwnProperty(p)) {
                    var s: string = ParamUtils.ReplaceParams(p, parameterList);
                    if (s != p) {
                        cards[s] = cards[p];
                        delete cards[p];
                    }
                }
            };
            var fillRules = tmplData.CardRules.rules["fill"];
            for (var i = 0; i < fillRules.length; i++) {
                var f = fillRules[i];
                if (f.filter != null) {
                    f.filter = ParamUtils.ReplaceParams(f.filter, parameterList);
                }
            };
        }

        var teamContext: any = {};
        teamContext.projectId = VSS.getWebContext().project.id;
        teamContext.team = tmplData.TeamName;
        

        var oldCardSettings = this.WorkClient.getBoardCardSettings(teamContext, tmplData.BoardName);
        var oldCardRules = this.WorkClient.getBoardCardRuleSettings(teamContext, tmplData.BoardName);
        var oldColumns = this.WorkClient.getBoardColumns(teamContext, tmplData.BoardName);

        var oldSettingPromises: IPromise<any>[] = [oldCardSettings, oldCardRules, oldColumns];
     

        Q.all(oldSettingPromises).then(
            oldSettings=> {
                var cardSettings = srv.UpdateCardSettings(tmplData.BoardName, tmplData.TeamName, tmplData.CardSettings);
                var cardRulesSettings = srv.UpdateCardRulesSettings(tmplData.BoardName, tmplData.TeamName, tmplData.CardRules);

                var promises: IPromise<any>[] = [ cardSettings, cardRulesSettings];

                if (tmplData.Columns != null) {

                    // replace parameters for states 
                    tmplData.Columns.forEach(col => {
                        for (var prop in col.stateMappings) {
                            // skip loop if the property is from prototype
                            if (!col.stateMappings.hasOwnProperty(prop))
                                continue;
                            col.stateMappings[prop] = ParamUtils.ReplaceParams(col.stateMappings[prop], parameterList);

                        }
                    });

                    
                    oldSettings[2].forEach(c => {
                        // Try to find the same state and index ...                    
                        var nc = tmplData.Columns.filter(i => {
                            return CompareStateMappings(i,c);
                        });
                        //TODO- Maybe need to compensate for multiple columns within the same statemapping
                        if (nc.length > 0) {
                            var bFound: boolean = false;

                            nc.forEach(c2 => {
                                if (c2.name === c.name) {
                                    bFound = true;
                                    c2.id = c.id;
                                }
                            });
                            if (!bFound) {
                                nc[0].id = c.id;
                            }
                        }
                    });
                    
                    tmplData.Columns[tmplData.Columns.length - 1].id = oldSettings[2][oldSettings[2].length-1].id;
                    promises.push(srv.UpdateColumns(tmplData.BoardName, tmplData.TeamName, tmplData.Columns));
                }

                Q.all(promises).then(
                    settings=> {
                        var installed: BoardSettingsTemplate = {
                            TeamName: tmplData.TeamName,
                            BoardName: tmplData.BoardName,
                            CardRules: oldSettings[1],
                            CardSettings: oldSettings[0],
                            Columns: oldSettings[2]
                        };

                        template.InstalledData = installed;

                        defer.resolve(template);
                    },
                    reject => {
                        TelemetryClient.getClient().trackException(reject, "BoardSettingsSampleDataService.PopulateData");
                        console.log(reject);
                        defer.reject(reject);
                    });
            },
            reject => {
                TelemetryClient.getClient().trackException(reject, "BoardSettingsSampleDataService.PopulateData");
                console.log(reject);
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
            var tmplData: BoardSettingsTemplate = installedData.InstalledData;


            var cardSettings = srv.UpdateCardSettings(tmplData.BoardName, tmplData.TeamName, tmplData.CardSettings);
            var cardRulesSettings = srv.UpdateCardRulesSettings(tmplData.BoardName, tmplData.TeamName, tmplData.CardRules);

            var promises: IPromise<any>[] = [cardSettings, cardRulesSettings];

            Q.all(promises).then(
                settings=> {
                    installedData.InstalledData = null;
                    deferred.resolve(installedData);
                },
                reject => {
                    TelemetryClient.getClient().trackException(reject, "BoardSettingsSampleDataService.RemoveData");
                    console.log(reject);
                    deferred.reject(reject);
                });
        }
        else {
            deferred.resolve(installedData);
        }

        return deferred.promise();
    }

    public UpdateCardSettings(board: string, teamName:string,  cardSettings: Contracts.BoardCardSettings): IPromise<Contracts.BoardCardSettings> {
        var deferred = $.Deferred<Contracts.BoardCardSettings>();
     
        var teamContext: any = {};
        teamContext.projectId= VSS.getWebContext().project.id;
        teamContext.team = teamName;
        
        this.WorkClient.updateBoardCardSettings(cardSettings, teamContext, board).then(
            newSettings => {
                deferred.resolve(newSettings);
            },
            reject=> {
                TelemetryClient.getClient().trackException(reject, "BoardSettingsSampleDataService.UpdateCardSettings");
                deferred.reject(reject);
            });
        
        return deferred.promise();
    }

    public UpdateCardRulesSettings(board: string, teamName: string, cardRules: Contracts.BoardCardRuleSettings): IPromise<Contracts.BoardCardRuleSettings> {
        var defer = $.Deferred<Contracts.BoardCardRuleSettings>();

        var teamContext: any = {};
        teamContext.projectId = VSS.getWebContext().project.id;
        teamContext.team = teamName;

        this.WorkClient.updateBoardCardRuleSettings(cardRules, teamContext, board).then(
            newSettings => {
                defer.resolve(newSettings);
            },
            reject=> {
                TelemetryClient.getClient().trackException(reject, "BoardSettingsSampleDataService.UpdateCardRulesSettings");
                defer.reject(reject);
            });

        return defer.promise();
    }

    public UpdateColumns(board: string, teamName: string, columns: Contracts.BoardColumn[]): IPromise<Contracts.BoardColumn[]> {
        var defer = $.Deferred<Contracts.BoardColumn[]>();

        var teamContext: any = {};
        teamContext.projectId = VSS.getWebContext().project.id;
        teamContext.team = teamName;

        this.WorkClient.updateBoardColumns(columns, teamContext, board).then(
            newSettings => {
                defer.resolve(newSettings);
            },
            reject => {
                TelemetryClient.getClient().trackException(reject, "BoardSettingsSampleDataService.UpdateColumns");
                defer.reject(reject);
            });

        return defer.promise();
    }


}

function CompareStateMappings(c1: Contracts.BoardColumn, c2: Contracts.BoardColumn): boolean {

    return JSON.stringify(c1.stateMappings) === JSON.stringify(c2.stateMappings);
}
