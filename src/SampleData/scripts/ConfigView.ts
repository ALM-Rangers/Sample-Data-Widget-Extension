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

import Controls = require("VSS/Controls");
import Combos = require("VSS/Controls/Combos");
//import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");

import SampleDataContracts = require("../scripts/SampleDataContract");
import Controller = require("../scripts/SampleDataController");

import TemplateServices = require("../scripts/TemplateServices");


export class ConfigView {
    public cbo: Combos.Combo;
    public WidgetHelpers;
    public WidgetContext;
    public CustomUrl: string;
    public AccountTemplate: string;

    public InitView(widgetSettings, WidgetContext) {
        TelemetryClient.getClient().trackPageView("Config");
        this.WidgetContext = WidgetContext;

        var view = this;
        
        $('#AccountSpecific').hide();
        this.notify(); // Force call to enable save button direct

        var srvTemplate = new TemplateServices.TemplateService();
        srvTemplate.LoadCustomTemplates().then(
            template => {
                $('#txtCustomTemplateData').val(JSON.stringify(template));
            });


        $('#chkCustomTemplate').change(args=> {
            if ($('#chkCustomTemplate').prop('checked')) {
                $('#AccountSpecific').show();
            }
            else {
                $('#AccountSpecific').hide();
            }
            this.notify();

        });
        $('#txtCustomTemplateData').change(args=> {
        
            this.notify();

        });
    }

    public SaveSettings(): IPromise<SampleDataContracts.ISampleDataTemplate[]> {
        var deferred = $.Deferred<SampleDataContracts.ISampleDataTemplate[]>();

        var srvTemplate = new TemplateServices.TemplateService();
        var templates = JSON.parse($('#txtCustomTemplateData').val());

        srvTemplate.SaveCustomTemplates(templates).then(
            save=> {
                console.log("SavedCustom Template");

                var notifyer = Controller.getInstance();
                notifyer.DoCallback();

                deferred.resolve(save);
            },
            err=> {
                console.log("Error saving Template");
                deferred.resolve(err);
            }
        );

        return deferred.promise();

    }
  
    public notify() {
        var eventName = this.WidgetHelpers.WidgetEvent.ConfigurationChange;
        var dataset = JSON.stringify({ test: "Value" })
        if ($('#chkCustomTemplate').prop('checked')) {
            dataset = JSON.stringify({
                test: JSON.parse($('#txtCustomTemplateData').val())
            });
        }

        var eventArgs = this.WidgetHelpers.WidgetEvent.Args({ data: dataset });
        this.WidgetContext.notify(eventName, eventArgs);
        
    }
}
