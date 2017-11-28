const ngrok = require('ngrok')
const util = require('util')

before(function(done) {
	if(process.env.NGROK_TOKEN) {
		let port = (process.env.PORT || 5000);
		ngrok.connect({authtoken:process.env.NGROK_TOKEN, addr:port}, function(err, url) {
			if(err) {
				console.error("ERROR: Unable to establish NGROK connection:", err);
			} else {
				process.env.TEST_CALLBACK = url
				process.env.ALAMO_APP_CONTROLLER_URL = url
			}
			let running_app = require('../../index.js')
			setTimeout(done, 500);
		})
	} else {

  		let running_app = require('../../index.js')
		setTimeout(done, 500);
	}
})

after(function(done) {
	if(process.env.NGROK_TOKEN) {
		ngrok.disconnect()
		ngrok.kill()
	}
	done()
})
