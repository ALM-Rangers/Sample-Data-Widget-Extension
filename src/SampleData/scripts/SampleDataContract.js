//---------------------------------------------------------------------
// <copyright file="SampleDataContract.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>
// </summary>
//---------------------------------------------------------------------
define(["require", "exports"], function (require, exports) {
    (function (executeAction) {
        executeAction[executeAction["Populate"] = 0] = "Populate";
        executeAction[executeAction["Remove"] = 1] = "Remove";
    })(exports.executeAction || (exports.executeAction = {}));
    var executeAction = exports.executeAction;
    ;
});
//# sourceMappingURL=SampleDataContract.js.map