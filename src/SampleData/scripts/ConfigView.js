//---------------------------------------------------------------------
// <copyright file="ConfigView.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>
// </summary>
//---------------------------------------------------------------------
define(["require", "exports", "../scripts/SampleDataController", "../scripts/TemplateServices"], function (require, exports, Controller, TemplateServices) {
    "use strict";
    var ConfigView = (function () {
        function ConfigView() {
        }
        ConfigView.prototype.InitView = function (widgetSettings, WidgetContext) {
            var _this = this;
            TelemetryClient.getClient().trackPageView("Config");
            this.WidgetContext = WidgetContext;
            var view = this;
            $('#AccountSpecific').hide();
            this.notify(); // Force call to enable save button direct
            var srvTemplate = new TemplateServices.TemplateService();
            srvTemplate.LoadCustomTemplates().then(function (template) {
                $('#txtCustomTemplateData').val(JSON.stringify(template));
            });
            $('#chkCustomTemplate').change(function (args) {
                if ($('#chkCustomTemplate').prop('checked')) {
                    $('#AccountSpecific').show();
                }
                else {
                    $('#AccountSpecific').hide();
                }
                _this.notify();
            });
            $('#txtCustomTemplateData').change(function (args) {
                _this.notify();
            });
        };
        ConfigView.prototype.SaveSettings = function () {
            var deferred = $.Deferred();
            var srvTemplate = new TemplateServices.TemplateService();
            var templates = JSON.parse($('#txtCustomTemplateData').val());
            srvTemplate.SaveCustomTemplates(templates).then(function (save) {
                console.log("SavedCustom Template");
                var notifyer = Controller.getInstance();
                notifyer.DoCallback();
                deferred.resolve(save);
            }, function (err) {
                console.log("Error saving Template");
                deferred.resolve(err);
            });
            return deferred.promise();
        };
        ConfigView.prototype.notify = function () {
            var eventName = this.WidgetHelpers.WidgetEvent.ConfigurationChange;
            var dataset = JSON.stringify({ test: "Value" });
            if ($('#chkCustomTemplate').prop('checked')) {
                dataset = JSON.stringify({
                    test: JSON.parse($('#txtCustomTemplateData').val())
                });
            }
            var eventArgs = this.WidgetHelpers.WidgetEvent.Args({ data: dataset });
            this.WidgetContext.notify(eventName, eventArgs);
        };
        return ConfigView;
    }());
    exports.ConfigView = ConfigView;
});
//# sourceMappingURL=ConfigView.js.map