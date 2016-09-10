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
define(["require", "exports"], function (require, exports) {
    "use strict";
    //export interface ISampleDataController {
    //    Populate(template: SampleDataContracts.ISampleDataTemplate, logCallBack: SampleDataContracts.ILogCallback): IPromise<SampleDataContracts.ISampleDataTemplate>;
    //    Remove(template: SampleDataContracts.ISampleDataTemplate, logCallBack: SampleDataContracts.ILogCallback): IPromise<SampleDataContracts.ISampleDataTemplate>;
    //    PopulatedTemplates: SampleDataContracts.ISampleDataTemplate[];
    //}
    var ProgressBar = (function () {
        function ProgressBar() {
        }
        ProgressBar.prototype.Init = function (containerId, containerMessageId, progressMessageStart, noOfTasks) {
            this.container = $(containerId)[0];
            this.messageContainer = $(containerMessageId)[0];
            this.ProgressMessageStart = progressMessageStart;
            var taskWidth = this.container.clientWidth / noOfTasks;
            this.divList = [];
            this.taskList = [];
            $(containerId).empty();
            for (var i = 0; i < noOfTasks; i++) {
                var c;
                c = $.parseHTML("<div class='ProgressTask TaskStatusNotStarted' style='width:" + taskWidth + "px' > </div>")[0];
                $(containerId).append(c);
                this.divList.push(c);
            }
        };
        ProgressBar.prototype.StartTask = function (name) {
            var task = new ProgressTask(this, this.divList[this.taskList.length]);
            task.Title(name);
            task.Start();
            this.taskList.push(task);
            return task;
        };
        ProgressBar.prototype.allTasksPassed = function () {
            return this.taskList.filter(function (t) {
                return t.state != TaskState.Done;
            }).length == 0;
        };
        ProgressBar.prototype.Refresh = function () {
            this.ReorderProgressBar();
            var s;
            var activeTask = this.taskList.filter(function (f) { return f.state == TaskState.InProgress; });
            s = activeTask.map(function (i) { return i.title; }).join(", ");
            this.messageContainer.textContent = this.ProgressMessageStart + " " + s + " ...";
        };
        ProgressBar.prototype.ReorderProgressBar = function () {
            var elemDone = $('.TaskStatusDone');
            var elemProgress = $('.TaskStatusInProgress');
            var elemFailed = $('.TaskStatusFailed');
            var elemNotStarted = $('.TaskStatusNotStarted');
            var container = $("#" + this.container.id);
            container.append(elemDone);
            container.append(elemFailed);
            container.append(elemProgress);
            container.append(elemNotStarted);
        };
        return ProgressBar;
    }());
    exports.ProgressBar = ProgressBar;
    var TaskState;
    (function (TaskState) {
        TaskState[TaskState["NotStarted"] = 0] = "NotStarted";
        TaskState[TaskState["InProgress"] = 1] = "InProgress";
        TaskState[TaskState["Done"] = 2] = "Done";
        TaskState[TaskState["Failed"] = 3] = "Failed";
    })(TaskState || (TaskState = {}));
    var ProgressTask = (function () {
        function ProgressTask(pgbar, ctrl) {
            this.progressBar = pgbar;
            this.control = ctrl;
            this.state = TaskState.NotStarted;
        }
        ProgressTask.prototype.Start = function () {
            this.control.className = "ProgressTask TaskStatusInProgress";
            this.state = TaskState.InProgress;
            this.progressBar.Refresh();
        };
        ProgressTask.prototype.Done = function () {
            this.control.className = "ProgressTask TaskStatusDone";
            this.state = TaskState.Done;
            this.progressBar.Refresh();
        };
        ProgressTask.prototype.Fail = function () {
            this.control.className = "ProgressTask TaskStatusFailed";
            this.state = TaskState.Failed;
            this.progressBar.Refresh();
        };
        ProgressTask.prototype.Log = function (message) {
            this.control.title += message;
        };
        ProgressTask.prototype.Title = function (t) {
            this.control.title = t;
            this.title = t;
        };
        return ProgressTask;
    }());
    exports.ProgressTask = ProgressTask;
});
//# sourceMappingURL=ProgressBar.js.map