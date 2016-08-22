/// <reference path="../sdk/jasmine/jasmine.d.ts" />
/// <reference path="../sdk/requirejs/require.d.ts" />
/// <reference path="../sdk/vss.d.ts" />

require.config({
    baseUrl: '../'
});

require(["Test/IterationSampleDataServiceTestSpec", "Test/InfrastructureTestSpec", "Test/TemplateServiceTestSpec"], () => {
    var jasmineEnv = jasmine.getEnv();    
    jasmineEnv.execute();
});