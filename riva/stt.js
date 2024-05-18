const { Writable } = require('stream');
const RivaASRClient = require("../riva_client/asr");
const DEFAULT_ENCODING = "MULAW";
const DEFAULT_SAMPLE_RATE = 8000;
const DEFAULT_LANGUAGE = "en-hi";
const DEFAULT_RESTART_TIME = 10; // in seconds
const DEFAULT_MAX_RESULTS = 100;
class RivaSTTClient extends Writable {

    /* Mapped encodings supported by Google */
    static encodings = {
        ulaw: "ENCODING_UNSPECIFIED",
        slin16: "LINEAR_PCM",
        mulaw: "MULAW",
        ulaw: 'MULAW'
    };

    /* Languages this provider supports  */
    static languages = [
        "en-US",
        "en-hi"
    ];

    constructor(options) {

        super();
        this.config = {
            encoding: DEFAULT_ENCODING,
            sampleRateHertz: DEFAULT_SAMPLE_RATE,
            languageCode: DEFAULT_LANGUAGE,
        };
        this.restartTimer = null;
        this.restartTimeout = options && options.restartTime || DEFAULT_RESTART_TIME;
        this.maxResults = options && options.maxResults || DEFAULT_MAX_RESULTS;

        this.results = [];
        this.start = this.start.bind(this);

    }

    _construct(callback) {
        this.client = new RivaASRClient();
        callback();
    }

    _write(chunk, encoding, callback) {
        if (this.client) {
            this.client.recognizeStream.write({ audio_content: chunk });
        }

        callback();
    }

    _writev(chunks, callback) {
        for (let chunk in chunks) {
            this._write(chunk, null, callback);
        }

        callback();
    }

    _final(callback) {
        this.stop();
        if (this.client)
            this.client.end();

        callback();
    }

    /**
     * Sets the configuration to use on the recognition stream.
     *
     * @param {Object} [config] - configuration to set
     * @param {Object} [config.codec] - the codec to map to an encoding
     * @param {string} [config.language] - the language to use
     */
    setConfig(config) {
        if (!config) {
            return;
        }

        let update = {};

        if (config.codec) {
            if (!(config.codec.name in RivaSTTClient.encodings)) {
                throw new Error("Codec '" + config.codec.name + " 'not supported");
            }
            update.encoding = RivaSTTClient.encodings[config.codec.name];
            update.sampleRate = config.codec.sampleRate;
        }

        if (config.language) {
            if (!RivaSTTClient.languages.includes(config.language)) {
                throw new Error("Language '" + config.language + " 'not supported");
            }

            update.language = config.language;
        }

        this.config = { ...this.config, ...update };
    }

    /**
     * Starts the recognition stream.
     *
     * @param {Object} [config] - configuration to use
     * @param {Object} [config.codec] - the codec to map to an encoding
     * @param {string} [config.language] - the language to use
     */
    start(config) {

        this.setConfig(config);
        config = this.config;
        console.log('setupASR', 8000, config.language, '183.82.10.251:50051', config.encoding, []);
        this.client.setupASR(8000, config.language, '183.82.10.251:50051', config.encoding, []);
        this.client.mainASR((result) => {
            try {
                console.log(result);
                if (result.error) {
                    console.error(`Endpoint failure: ${result.error}`);
                }
                if (result.end) {
                    console.info('Endpoint end');
                }
                if (result.transcript === undefined) {
                    console.info('Transcription callback endpoint');
                    return;
                }
                if (!result.is_final) {
                    console.warn({ isPartial: true, text: result.transcript });
                } else {
                    let _result = {
                        text: result.transcript,
                        score: 90,
                    };
                    console.warn(_result);
                    this.emit('result', _result);

                }
            } catch (error) {
                console.error(`Error in transcriptionCallback: ${error.message}`);
            }
        });

        while (this.writableCorked) {
            this.uncork();
        }
    }

    /**
         * Stops the recognition stream.
         */
    stop() {
        console.log('stop');
        if (this.restartTimer) {
            clearInterval(this.restartTimer);
            this.restartTimer = null;
        }

        if (!this.client) {
            return;
        }

        this.cork(); // Buffer any incoming data

        if (this.client)
            this.client.end();
    }

    /**
     * Restarts the recognition stream.
     *
     * @param {Object} [config] - configuration to use
     * @param {Object} [config.codec] - the codec to map to an encoding
     * @param {string} [config.language] - the language to use
     */
    restart(config) {
        this.stop();
        this.start(config);
    }
}

module.exports = RivaSTTClient;
