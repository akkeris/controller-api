
/*
 * Thus test is very problematic, it fails frequently due to race
 * conditions..
 
  let cover_worker_done = false;
  it("Covers ensuring worker is functioning", (done) => {
    expect(web_type_functioning).to.equal(true);
    httph.request('post', 'http://localhost:5000/apps/' + appname_brand_new + '-default/log-sessions', alamo_headers, JSON.stringify({lines:50,tail:false}),
    (err, data) => {
        expect(err).to.be.null;
        expect(data).to.be.a('string');
        let obj = JSON.parse(data);
        expect(obj.logplex_url).to.be.a('string');
        let proc = exec('curl', ['--no-buffer', '-s', obj.logplex_url]);
        let success = false;
        proc.stdout.on('data', (data) => {
          data = data.toString();
          data = data.split('\n');
          data.forEach((line) => {
            if(line.indexOf('--worker') > -1 && line.indexOf('worker test') > -1 && line.indexOf(appname_brand_new) > -1 && line.indexOf('interval') > -1) {
              success = true;
            }
          });
          if(success === true && !cover_worker_done) {
            proc.kill();
            cover_worker_done = true;
            done();
          }
        });
        proc.on('error',() => {
          expect(true).to.equal(false);
        });
    });
  });
*/