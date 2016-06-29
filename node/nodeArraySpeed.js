var stopwatch = function(){
      var start;

          this.Start =function(){
                    this.start = new Date().getTime();
                        }

              this.getDifference= function(){
                        return new Date().getTime() - this.start;
                            }
}

var stopwatch = new stopwatch();
var length = 1000000;
var array = new Array(length);
for(var i = 0; i<length; i++){
      array[i]=1;
};

stopwatch.Start();
for(var i = 0; i<length; i++){
      array[i]+1;
};
var time = stopwatch.getDifference();
console.log("Time of normal for: "+time);

stopwatch.Start();
array.forEach(function(entry){
      entry+1;
});
time = stopwatch.getDifference();
console.log("Time of forEach: "+time);

stopwatch.Start();
for(key in array){
      array[key]+1;
}
time = stopwatch.getDifference();
console.log("Time of for key in array: "+time);
