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
define(["require", "exports", "TFS/Work/RestClient", "TFS/Core/RestClient", "../scripts/ParamUtils"], function (require, exports, WorkClient, CoreClient, ParamUtils) {
    var BoardSettingsSampleDataService = (function () {
        function BoardSettingsSampleDataService() {
        }
        BoardSettingsSampleDataService.prototype.PopulateData = function (template, parameterList) {
            this.CoreClient = CoreClient.getClient();
            this.WorkClient = WorkClient.getClient();
            var srv = this;
            var defer = $.Deferred();
            var tmplData = template.TemplateData;
            tmplData.TeamName = ParamUtils.ReplaceParams(tmplData.TeamName, parameterList);
            tmplData.BoardName = ParamUtils.ReplaceParams(tmplData.BoardName, parameterList);
            if (tmplData.CardSettings != null) {
                var cards = tmplData.CardSettings.cards;
                for (var p in cards) {
                    if (cards.hasOwnProperty(p)) {
                        var s = ParamUtils.ReplaceParams(p, parameterList);
                        if (s != p) {
                            cards[s] = cards[p];
                            delete cards[p];
                        }
                    }
                }
                ;
                var fillRules = tmplData.CardRules.rules["fill"];
                for (var i = 0; i < fillRules.length; i++) {
                    var f = fillRules[i];
                    if (f.filter != null) {
                        f.filter = ParamUtils.ReplaceParams(f.filter, parameterList);
                    }
                }
                ;
            }
            var teamContext = {};
            teamContext.projectId = VSS.getWebContext().project.id;
            teamContext.team = tmplData.TeamName;
            var oldCardSettings = this.WorkClient.getBoardCardSettings(teamContext, tmplData.BoardName);
            var oldCardRules = this.WorkClient.getBoardCardRuleSettings(teamContext, tmplData.BoardName);
            var oldColumns = this.WorkClient.getBoardColumns(teamContext, tmplData.BoardName);
            var oldSettingPromises = [oldCardSettings, oldCardRules, oldColumns];
            Q.all(oldSettingPromises).then(function (oldSettings) {
                var cardSettings = srv.UpdateCardSettings(tmplData.BoardName, tmplData.TeamName, tmplData.CardSettings);
                var cardRulesSettings = srv.UpdateCardRulesSettings(tmplData.BoardName, tmplData.TeamName, tmplData.CardRules);
                var promises = [cardSettings, cardRulesSettings];
                if (tmplData.Columns != null) {
                    // replace parameters for states 
                    tmplData.Columns.forEach(function (col) {
                        for (var prop in col.stateMappings) {
                            // skip loop if the property is from prototype
                            if (!col.stateMappings.hasOwnProperty(prop))
                                continue;
                            col.stateMappings[prop] = ParamUtils.ReplaceParams(col.stateMappings[prop], parameterList);
                        }
                    });
                    oldSettings[2].forEach(function (c) {
                        // Try to find the same state and index ...                    
                        var nc = tmplData.Columns.filter(function (i) {
                            return CompareStateMappings(i, c);
                        });
                        //TODO- Maybe need to compensate for multiple columns within the same statemapping
                        if (nc.length > 0) {
                            var bFound = false;
                            nc.forEach(function (c2) {
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
                    tmplData.Columns[tmplData.Columns.length - 1].id = oldSettings[2][oldSettings[2].length - 1].id;
                    promises.push(srv.UpdateColumns(tmplData.BoardName, tmplData.TeamName, tmplData.Columns));
                }
                Q.all(promises).then(function (settings) {
                    var installed = {
                        TeamName: tmplData.TeamName,
                        BoardName: tmplData.BoardName,
                        CardRules: oldSettings[1],
                        CardSettings: oldSettings[0],
                        Columns: oldSettings[2]
                    };
                    template.InstalledData = installed;
                    defer.resolve(template);
                }, function (reject) {
                    TelemetryClient.getClient().trackException(reject, "BoardSettingsSampleDataService.PopulateData");
                    console.log(reject);
                    defer.reject(reject);
                });
            }, function (reject) {
                TelemetryClient.getClient().trackException(reject, "BoardSettingsSampleDataService.PopulateData");
                console.log(reject);
                defer.reject(reject);
            });
            return defer.promise();
        };
        BoardSettingsSampleDataService.prototype.RemoveData = function (installedData, parameterList) {
            this.CoreClient = CoreClient.getClient();
            this.WorkClient = WorkClient.getClient();
            var deferred = $.Deferred();
            var srv = this;
            if (installedData.InstalledData != null) {
                var tmplData = installedData.InstalledData;
                var cardSettings = srv.UpdateCardSettings(tmplData.BoardName, tmplData.TeamName, tmplData.CardSettings);
                var cardRulesSettings = srv.UpdateCardRulesSettings(tmplData.BoardName, tmplData.TeamName, tmplData.CardRules);
                var promises = [cardSettings, cardRulesSettings];
                Q.all(promises).then(function (settings) {
                    installedData.InstalledData = null;
                    deferred.resolve(installedData);
                }, function (reject) {
                    TelemetryClient.getClient().trackException(reject, "BoardSettingsSampleDataService.RemoveData");
                    console.log(reject);
                    deferred.reject(reject);
                });
            }
            else {
                deferred.resolve(installedData);
            }
            return deferred.promise();
        };
        BoardSettingsSampleDataService.prototype.UpdateCardSettings = function (board, teamName, cardSettings) {
            var deferred = $.Deferred();
            var teamContext = {};
            teamContext.projectId = VSS.getWebContext().project.id;
            teamContext.team = teamName;
            this.WorkClient.updateBoardCardSettings(cardSettings, teamContext, board).then(function (newSettings) {
                deferred.resolve(newSettings);
            }, function (reject) {
                TelemetryClient.getClient().trackException(reject, "BoardSettingsSampleDataService.UpdateCardSettings");
                deferred.reject(reject);
            });
            return deferred.promise();
        };
        BoardSettingsSampleDataService.prototype.UpdateCardRulesSettings = function (board, teamName, cardRules) {
            var defer = $.Deferred();
            var teamContext = {};
            teamContext.projectId = VSS.getWebContext().project.id;
            teamContext.team = teamName;
            this.WorkClient.updateBoardCardRuleSettings(cardRules, teamContext, board).then(function (newSettings) {
                defer.resolve(newSettings);
            }, function (reject) {
                TelemetryClient.getClient().trackException(reject, "BoardSettingsSampleDataService.UpdateCardRulesSettings");
                defer.reject(reject);
            });
            return defer.promise();
        };
        BoardSettingsSampleDataService.prototype.UpdateColumns = function (board, teamName, columns) {
            var defer = $.Deferred();
            var teamContext = {};
            teamContext.projectId = VSS.getWebContext().project.id;
            teamContext.team = teamName;
            this.WorkClient.updateBoardColumns(columns, teamContext, board).then(function (newSettings) {
                defer.resolve(newSettings);
            }, function (reject) {
                TelemetryClient.getClient().trackException(reject, "BoardSettingsSampleDataService.UpdateColumns");
                defer.reject(reject);
            });
            return defer.promise();
        };
        return BoardSettingsSampleDataService;
    })();
    exports.BoardSettingsSampleDataService = BoardSettingsSampleDataService;
    function CompareStateMappings(c1, c2) {
        return JSON.stringify(c1.stateMappings) === JSON.stringify(c2.stateMappings);
    }
});
//# sourceMappingURL=BoardSettingsSampleDataService.js.map