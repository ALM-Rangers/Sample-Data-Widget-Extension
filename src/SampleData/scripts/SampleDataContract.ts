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

import ParamUtils = require("../scripts/ParamUtils");


export interface ISampleDataServiceTemplate {
    Service: string;
    Name: string;
    DependentOn?: string;
    TemplateData: any;
    InstalledData?: any;
}

export interface ISampleDataTemplate {
    Name: string;
    Description: string;
    IconUrl: string;
    Message: string;
    TryItLink: string;
    TryItLinkText?: string;
    InstructionsLink?: string;
    InstructionsWidth?: number;
    Parameters?: ParamUtils.ITemplateParameter[];
    DataServices: ISampleDataServiceTemplate[];
    InstalledDate?: Date;

}

export interface ILogCallback { Log(message: string): void }

export enum executeAction { Populate, Remove };


export interface ISampleDataService {
    PopulateData(templateData: ISampleDataServiceTemplate, parameterList: ParamUtils.ITemplateParameter[]): IPromise<ISampleDataServiceTemplate>;
    RemoveData(installedData: ISampleDataServiceTemplate, parameterList: ParamUtils.ITemplateParameter[]): IPromise<ISampleDataServiceTemplate>;

    //  Log(message: string): void;
}