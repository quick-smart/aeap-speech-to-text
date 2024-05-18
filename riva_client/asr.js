/*
 * SPDX-FileCopyrightText: Copyright (c) 2022 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
 * SPDX-License-Identifier: MIT
 */

require('dotenv').config();
//var grpc = require('@grpc/grpc-js');
var grpc = require("grpc");
var protoLoader = require("@grpc/proto-loader");

var protoRoot = __dirname + "/protos/riva/proto/";

var asrProto = "riva_asr.proto";
var audioProto = "riva_audio.proto";

var protoOptions = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [protoRoot],
};
var asrPkgDef = protoLoader.loadSync(asrProto, protoOptions);
var rasr = grpc.loadPackageDefinition(asrPkgDef).nvidia.riva.asr;
var audioPkgDef = protoLoader.loadSync(audioProto, protoOptions);
var rAudio = grpc.loadPackageDefinition(audioPkgDef).nvidia.riva;
const Encodings = {
    ENCODING_UNSPECIFIED: rAudio.AudioEncoding.type.value[0].name,
    LINEAR_PCM: rAudio.AudioEncoding.type.value[1].name,
    FLAC: rAudio.AudioEncoding.type.value[2].name,
    MULAW: rAudio.AudioEncoding.type.value[3].name,
    ALAW: rAudio.AudioEncoding.type.value[4].name,
};

/*
 * RivaASRclient is a grpc Client implementing the Riva API for ASR - Recognize and RecognizeStreaming requests.
 *
 */

class RivaASRClient {
    setupASR(
        sampleRateHz = 8000,
        languageCode = `"${process.env.LANGUAGE}"`,
        url = process.env.RIVA_API_URL,
        encoding = Encodings.MULAW,
        phrases = [],
        maxAlts = 4,
        punctuate = false
    ) {
        console.log('RivaASRClient setupASR ', sampleRateHz,
            languageCode,
            url,
            encoding);
        this.asrClient = new rasr.RivaSpeechRecognition(
            url,
            grpc.credentials.createInsecure()
        );
        this.firstRequest = {
            streaming_config: {
                config: {
                    encoding: encoding,
                    sample_rate_hertz: sampleRateHz,
                    language_code: languageCode,
                    max_alternatives: maxAlts,
                    enable_automatic_punctuation: punctuate,
                    speech_contexts: [{
                        phrases: phrases,
                        boost: 80.0,
                    }],
                },
                interim_results: true,
            },
        };
        this.numCharsPrinted = 0;
        // console.log(this.firstRequest);
        return true;
    }

    async mainASR(transcriptionCallback) {
        try {
            this.recognizeStream = this.asrClient
                .streamingRecognize()
                .on("data", data => {
                    console.log(data);
                    if (data.results && data.results[0]) {
                        const result = {
                            transcript: data.results[0].alternatives[0].transcript,
                            is_final: data.results[0].is_final,
                        };
                        transcriptionCallback(result);
                    }
                })
                .on("error", error => {
                    console.error("Error via streamingRecognize callback:", error);
                    transcriptionCallback({ error: error });
                })
                .on("end", () => {
                    console.log("StreamingRecognize end");
                    transcriptionCallback({ end: true });
                });
            console.log(this.firstRequest);
            this.recognizeStream.write(this.firstRequest);
        } catch (error) {
            console.error("Error in mainASR:", error);
            transcriptionCallback({ error: error });
        }
    }

    end() {
        this.recognizeStream?.end();
    }
}

module.exports = RivaASRClient;
