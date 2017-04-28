var chai = require('chai').should();

var subject;

describe("linkAll", function(){
  beforeEach(function(){
    subject = require('../');
  });

  it("exist", function(){
    subject.should.be.ok;
  });

  describe("getModules", function(){
    var getModules = subject.getModules;

    it("gets default", function(){
      getModules({orig: 'proj1'}).should.deep.equal({
        "peer1Proj1": "not real",
        "peer2Proj1": "not real"
      });
    });
  });
});
