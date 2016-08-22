//---------------------------------------------------------------------
// <copyright file="ProgressBar.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>
// </summary>
//---------------------------------------------------------------------

import SampleDataContracts = require("../scripts/SampleDataContract");


//export interface ISampleDataController {

//    Populate(template: SampleDataContracts.ISampleDataTemplate, logCallBack: SampleDataContracts.ILogCallback): IPromise<SampleDataContracts.ISampleDataTemplate>;
//    Remove(template: SampleDataContracts.ISampleDataTemplate, logCallBack: SampleDataContracts.ILogCallback): IPromise<SampleDataContracts.ISampleDataTemplate>;

//    PopulatedTemplates: SampleDataContracts.ISampleDataTemplate[];
//}

export class ProgressBar {

    private container;
    private messageContainer;
    private taskList: ProgressTask[];
    private divList: HTMLDivElement[];
    public ProgressMessageStart: string;
    public constructor() {

    }

    public Init(containerId: string, containerMessageId: string, progressMessageStart:string,  noOfTasks:number) {
        
        this.container = $(containerId)[0];
        this.messageContainer = $(containerMessageId)[0];
        this.ProgressMessageStart = progressMessageStart;

        var taskWidth: number = this.container.clientWidth / noOfTasks;

        this.divList = [];

        this.taskList = [];
        $(containerId).empty();

        for (var i = 0; i < noOfTasks; i++){
            
            var c: HTMLDivElement; 
            c= $.parseHTML("<div class='ProgressTask TaskStatusNotStarted' style='width:" + taskWidth + "px' > </div>")[0];
            $(containerId).append(c);
            this.divList.push(c);
        }

    }

    public StartTask(name: string): ProgressTask {

        var task = new ProgressTask(this, this.divList[this.taskList.length]);
        task.Title(name);
        task.Start();
        this.taskList.push(task)
        return task;
    }
    public allTasksPassed(): boolean {

        return this.taskList.filter(t=> {
            return t.state != TaskState.Done;
        }).length == 0;
        
    }

    public Refresh(): void{
        this.ReorderProgressBar();
        var s: string;
        var activeTask = this.taskList.filter(f=> { return f.state == TaskState.InProgress; });
        s = activeTask.map( i=> {return i.title;}).join(", ");
        this.messageContainer.textContent = this.ProgressMessageStart + " "+ s + " ...";
    }

    public ReorderProgressBar(): void {
        var elemDone = $('.TaskStatusDone');
        var elemProgress = $('.TaskStatusInProgress');
        var elemFailed = $('.TaskStatusFailed');
        var elemNotStarted = $('.TaskStatusNotStarted');

        var container = $("#" + this.container.id);
        container.append(elemDone);
        container.append(elemFailed);
        container.append(elemProgress);
        container.append(elemNotStarted);
    }

}

 enum TaskState {NotStarted, InProgress, Done, Failed }

export class ProgressTask implements SampleDataContracts.ILogCallback {
    private control: HTMLDivElement;
    private progressBar: ProgressBar;
    public state: TaskState;
    public title: string;
    
    constructor(pgbar: ProgressBar, ctrl: HTMLDivElement) {
        this.progressBar = pgbar;
        this.control = ctrl;
        this.state = TaskState.NotStarted;
    }

    public Start() {
        this.control.className = "ProgressTask TaskStatusInProgress";
        this.state = TaskState.InProgress;
        this.progressBar.Refresh();

    }

    public Done() {
        this.control.className = "ProgressTask TaskStatusDone";
        
        this.state = TaskState.Done;
        this.progressBar.Refresh();

    }
    public Fail() {
        this.control.className = "ProgressTask TaskStatusFailed";
        this.state = TaskState.Failed;
        this.progressBar.Refresh();
    }

    public Log(message: string): void{
        this.control.title += message;
    }
    
    public Title(t: string) {
        this.control.title = t;
        this.title = t;
    }

    
}
