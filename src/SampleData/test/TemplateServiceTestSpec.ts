
///// <reference path="../sdk/tsd.d.ts" />

import TemplateService = require("../scripts/templateservices");

export module TemplateServiceTestSpec {
    describe("TemplateServiceTestSpec", () => {
        it("getDefaultTemplates", done => {
            var templateService = new TemplateService.TemplateService();

            spyOn(VSS, "getExtensionContext").and.returnValue(
                {
                    baseUri: "./",
                    publisherId: "test",
                    extensionId: "test-extension",
                    version : "1"
                }
            );

            templateService.getDefaultTemplates().then(data => {
                expect(VSS.getExtensionContext).toHaveBeenCalled();
                expect(data.length).toBe(1);
                done();

            });
          
        });

    });
}