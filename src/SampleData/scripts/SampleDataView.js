//---------------------------------------------------------------------
// <copyright file="SampleDataView.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>
// </summary>
//---------------------------------------------------------------------
define(["require", "exports", "VSS/Controls", "VSS/Controls/Combos", "../scripts/TemplateServices", "../scripts/ProgressBar"], function (require, exports, Controls, Combos, TemplateServices, ProgressBar) {
    "use strict";
    var SampleDataView = (function () {
        function SampleDataView() {
        }
        SampleDataView.prototype.Notify = function (message) {
            this.LoadTemplates();
        };
        SampleDataView.prototype.InitView = function (ctrl) {
            TelemetryClient.getClient().trackPageView("SampleDataWidget");
            $("#PopulatedTemplate").hide();
            $(".SubTitle").hide();
            $("#Create").hide();
            var view = this;
            // Set the tooltip to show version
            $('#ExtTitle').attr('title', VSS.getExtensionContext().extensionId + " " + VSS.getExtensionContext().version);
            view.controller = ctrl;
            view.progresBar = new ProgressBar.ProgressBar();
            view.showCreate = true;
            view.controller.LoadTemplates().then(function (data) {
                $("#InitialLoad").hide();
                $("#PopulatedTemplate").show();
                $(".SubTitle").show();
                $("#Create").show();
                view.templates = data;
                var cboTemplateOptions = {
                    width: "100%",
                    source: view.templates.map(function (i) {
                        return i.Name;
                    })
                };
                view.cbo = Controls.create(Combos.Combo, $('#TemplateDropDown'), cboTemplateOptions);
                view.cbo.setSelectedIndex(0);
                view.showPanels();
            });
            var templateService = new TemplateServices.TemplateService();
            templateService.getPopulatedTemplates().then(function (data) {
                view.lstPopulatedTemplates = data;
                if (data.length > 0) {
                    view.populatedTemplate = data[0];
                    view.showCreate = false;
                }
                view.showPanels();
            }, function (err) {
                view.showCreate = true;
                view.showPanels();
            });
            view.showPanels();
            $('#Create').on("click", function () {
                $("#CreateFromTemplate").hide();
                $("#PopulatedTemplate").hide();
                $("#ProgressTitleCreate").show();
                $("#ProgressTitleDelete").hide();
                $("#Progress").show();
                var selectedTemplateName = view.cbo.getText();
                var selectedTemplate = view.templates.filter(function (t) {
                    return t.Name == selectedTemplateName;
                })[0];
                TelemetryClient.getClient().trackEvent("CreateClick", { Template: selectedTemplate.Name });
                view.progresBar.Init("#ProgressBar", "#ProgressMessage", "Creating", selectedTemplate.DataServices.length + 1); //1 extra for saving template data
                view.controller.Populate(selectedTemplate, view.progresBar).then(function (tmpl) {
                    if (view.progresBar.allTasksPassed()) {
                        view.showCreate = false;
                        view.populatedTemplate = tmpl;
                        view.lstPopulatedTemplates = view.controller.PopulatedTemplates;
                        view.showPanels();
                    }
                    else {
                        view.ShowError();
                    }
                }, function (err) {
                    view.ShowError();
                });
            });
            $('#Delete').on("click", function () {
                $("#CreateFromTemplate").hide();
                $("#PopulatedTemplate").hide();
                $("#ProgressTitleCreate").hide();
                $("#ProgressTitleDelete").show();
                $("#Progress").show();
                view.progresBar.Init("#ProgressBar", "#ProgressMessage", "Deleting", view.populatedTemplate.DataServices.length + 1); //1 extra for saving template data
                TelemetryClient.getClient().trackEvent("DeleteClick", { Template: view.populatedTemplate.Name });
                view.controller.Remove(view.populatedTemplate, view.progresBar).then(function (tmpl) {
                    if (view.progresBar.allTasksPassed()) {
                        view.showCreate = false;
                        view.lstPopulatedTemplates = view.controller.PopulatedTemplates;
                        if (view.lstPopulatedTemplates.length > 0) {
                            view.populatedTemplate = view.lstPopulatedTemplates[0];
                        }
                        view.showPanels();
                    }
                    else {
                        view.ShowError();
                    }
                }, function (err) {
                    view.ShowError();
                });
            });
            $('#DeleteFailed').on("click", function () {
                $("#CreateFromTemplate").hide();
                $("#PopulatedTemplate").hide();
                $("#ErrorMsg").hide();
                $("#Progress").show();
                view.showPanels();
                view.controller.Remove(view.populatedTemplate, null).then(function (tmpl) {
                    view.showCreate = false;
                    view.lstPopulatedTemplates = view.controller.PopulatedTemplates;
                    if (view.lstPopulatedTemplates.length > 0) {
                        view.populatedTemplate = view.lstPopulatedTemplates[0];
                    }
                    view.showPanels();
                }, function (err) {
                    TelemetryClient.getClient().trackException(err);
                });
            });
            $('#ShowCreate').on("click", function () {
                view.showCreate = true;
                view.showPanels();
            });
            $('#ShowPopulatedTemplates').on("click", function () {
                view.showCreate = false;
                view.showPanels();
            });
            $('#MovePrev').on("click", function () {
                var curr = view.lstPopulatedTemplates.indexOf(view.populatedTemplate);
                if (curr >= 1) {
                    curr -= 1;
                }
                else {
                    curr = 0;
                }
                view.populatedTemplate = view.lstPopulatedTemplates[curr];
                view.showPanels();
            });
            $('#MoveNext').on("click", function () {
                var curr = view.lstPopulatedTemplates.indexOf(view.populatedTemplate);
                if (curr < view.lstPopulatedTemplates.length - 1) {
                    curr += 1;
                }
                view.populatedTemplate = view.lstPopulatedTemplates[curr];
                view.showPanels();
            });
            $("#TryItLink").on("click.OpenInstructions", function (eventData) {
                return view.OpenInstructionsPopup();
            });
            console.log("view done");
        };
        SampleDataView.prototype.LoadTemplates = function () {
            var view = this;
            view.controller.LoadTemplates().then(function (data) {
                view.templates = data;
                view.cbo.setSource(view.templates.map(function (i) {
                    return i.Name;
                }));
                view.cbo.setSelectedIndex(0);
                view.showPanels();
            });
        };
        SampleDataView.prototype.ShowError = function () {
            $("#ProgressTitleCreate").hide();
            $("#ProgressTitleDelete").hide();
            $("#ErrorMsg").show();
        };
        SampleDataView.prototype.showPanels = function () {
            $("#Progress").hide();
            if (this.showCreate) {
                $("#PopulatedTemplate").hide();
                $('#ShowPopulatedTemplates').hide();
                if (this.lstPopulatedTemplates && this.lstPopulatedTemplates.length > 0) {
                    $('#ShowPopulatedTemplates').show();
                }
                $("#CreateFromTemplate").show();
            }
            else {
                $("#CreateFromTemplate").hide();
                if (this.populatedTemplate != null && this.lstPopulatedTemplates.length > 0) {
                    var imgSrc = this.populatedTemplate.IconUrl;
                    if (imgSrc.indexOf("http:") == -1 && imgSrc.indexOf("https:") == -1) {
                        imgSrc = VSS.getExtensionContext().baseUri + imgSrc;
                    }
                    $("#TemplateIcon").attr("src", imgSrc);
                    $("#TemplateName").text(this.populatedTemplate.Name);
                    $("#TemplateMessage").empty();
                    $("#TemplateMessage").append(this.populatedTemplate.Message);
                    if (this.populatedTemplate.InstalledDate != null) {
                        $("#TryItLink").show();
                        $("#TryItLink").attr("href", VSS.getWebContext().collection.uri + "/" + VSS.getWebContext().project.name + "/" + this.populatedTemplate.TryItLink);
                        if (this.populatedTemplate.TryItLinkText != null) {
                            $("#TryItLink").text(this.populatedTemplate.TryItLinkText);
                        }
                        else {
                            $("#TryItLink").text("Try it");
                        }
                        $("#TemplateError").hide();
                    }
                    else {
                        $("#TryItLink").hide();
                        $("#TemplateError").show();
                    }
                    $("#PopulatedTemplate").show();
                    if (this.lstPopulatedTemplates.length > 1) {
                        $("#TemplateNavigator").show();
                        var pos = this.lstPopulatedTemplates.indexOf(this.populatedTemplate) + 1;
                        var cnt = this.lstPopulatedTemplates.length;
                        $("#TemplateIndex").text(pos + " of " + cnt);
                    }
                    else {
                        $("#TemplateNavigator").hide();
                    }
                }
                else {
                    this.showCreate = true;
                    this.showPanels();
                }
            }
        };
        SampleDataView.prototype.OpenInstructionsPopup = function () {
            // Wait until resize parent support
            //window.top.resizeBy(-350, 0);
            //window.top.moveTo(0, 0);
            var view = this;
            if (this.populatedTemplate.InstructionsLink != null) {
                var width = view.populatedTemplate.InstructionsWidth;
                if (width == null) {
                    width = 300;
                }
                var height = screen.height;
                var leftMainWin = 0;
                var widthMainWin = screen.width - width - 16;
                var leftPopUp = screen.width - width;
                var top = 0;
                var paramsPopUp = 'width=' + width + ', height=' + height;
                paramsPopUp += ', top=' + top + ', left=' + leftPopUp;
                paramsPopUp += ', directories=no';
                paramsPopUp += ', location=no';
                paramsPopUp += ', menubar=no';
                paramsPopUp += ', resizable=yes';
                paramsPopUp += ', scrollbars=yes';
                paramsPopUp += ', status=no';
                paramsPopUp += ', toolbar=no';
                var paramsMainWin = 'width=' + widthMainWin + ', height=' + height;
                paramsMainWin += ', top=' + top + ', left=' + leftMainWin;
                paramsMainWin += ', directories=no';
                paramsMainWin += ', location=no';
                paramsMainWin += ', menubar=no';
                paramsMainWin += ', resizable=yes';
                paramsMainWin += ', scrollbars=yes';
                paramsMainWin += ', status=no';
                paramsMainWin += ', toolbar=no';
                var urlMainWin = VSS.getWebContext().collection.uri + "/" + VSS.getWebContext().project.name + "/" + this.populatedTemplate.TryItLink;
                window.open(urlMainWin, "VstsMainWnd", paramsMainWin);
                window.open(view.populatedTemplate.InstructionsLink, "SampleDataInstruction", paramsPopUp);
                return false;
            }
            else {
                return true;
            }
        };
        return SampleDataView;
    }());
    exports.SampleDataView = SampleDataView;
});
//# sourceMappingURL=SampleDataView.js.map