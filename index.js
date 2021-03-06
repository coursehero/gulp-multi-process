'use strict';

var spawn = require('child_process').spawn;

var gulpMultiProcess = function(tasks, cb, cpuRatio, failOnFirstError) {
  var code = 0;
  var completed;
  var each;
  var cpusNumber;
  var q;
  var createWorker = function(onExit, taskName) {
      var args = process.execArgv.concat([process.argv[1], taskName]);
      var worker;
      process.argv.forEach(function (val) {
        if(val[0] === '-' && val !== '--gulpfile') {
          args.push(val);
        }
      });
      worker = spawn(process.execPath, args , { stdio: 'inherit' });
      worker.on('exit', onExit);
  };

  if (!cpuRatio) {
    completed = 0;
    each = createWorker.bind(this, function (workerCode) {
      if(workerCode !== 0)  {
        if (failOnFirstError) {
          throw new Error('Task exited with code: ' + workerCode)
        }
        code = workerCode;
      }
      completed++;
      if(completed === tasks.length) {
        cb(code);
      }
    });
    tasks.forEach(each);
  } else {
    cpusNumber = Math.floor( (process.env.GULP_MULTI_MAX_PROC ? 
      process.env.GULP_MULTI_MAX_PROC : require('os').cpus().length) * cpuRatio);
    q = require('async.queue');
    q = q(function (taskName, callback) {
      createWorker(
        function (workerCode) {
          if(workerCode !== 0) {
            if (failOnFirstError) {
              throw new Error('Task exited with code: ' + workerCode)
            }
            code = workerCode;
          }
          callback();
        },
        taskName
      );
    }, cpusNumber);
    tasks.forEach(function (task) {
      q.push(task)
    });

    q.drain = function () {
      cb(code);
    }
  }
};

module.exports = gulpMultiProcess;
