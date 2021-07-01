#include <emscripten.h>
#include "converter.hpp"

#include "elements/dsp/part.h"
#include <stdio.h>

const size_t kAudioBlockSize = 16;

typedef float buf_ref[64];

class ModalState {
public:
	elements::Part *part;
	elements::PerformanceState state;
	uint16_t reverb_buffer[32768];

	int renderedBufferSize;
	float *main;
	float *aux;
	float blow_in[kAudioBlockSize];
	float strike_in[kAudioBlockSize];
	elements::Patch *patch;

	Converter *outputSrc = 0;
	float renderedL[kAudioBlockSize] = {};
    float renderedR[kAudioBlockSize] = {};
    int renderedFramesPos = 0;

	ModalState() {
		this->part = new elements::Part();
		this->part->Init(this->reverb_buffer);

		this->state.note = 30;
		this->state.gate = false;
		this->state.modulation = 0;

		this->patch = this->part->mutable_patch();

		this->patch->exciter_envelope_shape = 0.2f;
        this->patch->exciter_bow_level = 0.4f;
        this->patch->exciter_bow_timbre = 0.4f;
        this->patch->exciter_blow_level = 0.0f;
        this->patch->exciter_blow_meta = 0.0f;
        this->patch->exciter_blow_timbre = 0.0f;
        this->patch->exciter_strike_level = 0.7f;
        this->patch->exciter_strike_meta = 0.5f;
        this->patch->exciter_strike_timbre = 0.4f;
        this->patch->resonator_geometry = 0.2f;
        this->patch->resonator_brightness = 0.8f;
        this->patch->resonator_damping = 0.5f;
        this->patch->resonator_position = 0.3f;
        this->patch->space = 0.8f;
	}

	void init(int inSampleRate) {
		this->outputSrc = new Converter(32000, (int) inSampleRate);
		this->renderedBufferSize = 32000 * (1 + (inSampleRate / 32000));
		this->main = (float *) malloc(sizeof(float) * renderedBufferSize);
		this->aux = (float *) malloc(sizeof(float) * renderedBufferSize);
	}

	int process(bool gate, float note)  {
		float main[kAudioBlockSize];
		float aux[kAudioBlockSize];
		ConverterResult result;

		this->state.gate = gate;
		this->state.note = note;

		part->Process(this->state, blow_in, strike_in, &main[0], &aux[0], kAudioBlockSize);

		this->outputSrc->convert(main, aux, kAudioBlockSize, this->main, this->aux, this->renderedBufferSize, &result);
		return result.outputLength;
	}

	float mainVal(int i) {
		return this->main[i];
	}

	float auxVal(int i) {
		return this->aux[i];
	}

	void exciterEnvShape(float v) {
		this->patch->exciter_envelope_shape = v;
	}

	void exciterBowLevel(float v) {
		this->patch->exciter_bow_level = v;
	}

	void exciterBowTimbre(float v) {
		this->patch->exciter_bow_timbre = v;
	}

	void exciterBlowLevel(float v) {
		this->patch->exciter_blow_level = v;
	}

	void exciterBlowMeta(float v) {
		this->patch->exciter_blow_meta = v;
	}

	void exciterBlowTimbre(float v) {
		this->patch->exciter_blow_timbre = v;
	}

	void exciterStrikeLevel(float v) {
		this->patch->exciter_strike_level = v;
	}

	void exciterStrikeMeta(float v) {
		this->patch->exciter_strike_meta = v;
	}

	void exciterStrikeTimbre(float v) {
		this->patch->exciter_strike_timbre = v;
	}

	void resonatorGeometry(float v) {
		this->patch->resonator_geometry = v;
	}

	void resonatorBrightness(float v) {
		this->patch->resonator_brightness = v;
	}

	void resonatorDamping(float v) {
		this->patch->resonator_damping = v;
	}

	void resonatorPosition(float v) {
		this->patch->resonator_position = v;
	}

	void space(float v) {
		this->patch->space = v;
	}

	void resonatorModel(int v) {
		if (v == 3) {
			this->part->set_easter_egg(true);
		} else {
			this->part->set_easter_egg(false);
			this->part->set_resonator_model((elements::ResonatorModel) v);
		}
	}

};

#include <emscripten/bind.h>
EMSCRIPTEN_BINDINGS(ModalState) {
  emscripten::class_<ModalState>("ModalState")
    .constructor<>()
	.function("init", &ModalState::init)
	.function("exciterEnvShape", &ModalState::exciterEnvShape)
	.function("exciterBowLevel", &ModalState::exciterBowLevel)
	.function("exciterBowTimbre", &ModalState::exciterBowTimbre)
	.function("exciterBlowLevel", &ModalState::exciterBlowLevel)
	.function("exciterBlowMeta", &ModalState::exciterBlowMeta)
	.function("exciterBlowTimbre", &ModalState::exciterBlowTimbre)
	.function("exciterStrikeLevel", &ModalState::exciterStrikeLevel)
	.function("exciterStrikeMeta", &ModalState::exciterStrikeMeta)
	.function("exciterStrikeTimbre", &ModalState::exciterStrikeTimbre)
	.function("resonatorGeometry", &ModalState::resonatorGeometry)
	.function("resonatorBrightness", &ModalState::resonatorBrightness)
	.function("resonatorDamping", &ModalState::resonatorDamping)
	.function("resonatorPosition", &ModalState::resonatorPosition)
	.function("space", &ModalState::space)
	.function("resonatorModel", &ModalState::resonatorModel)
    .function("process", &ModalState::process)
	.function("mainVal", &ModalState::mainVal)
    .function("auxVal", &ModalState::auxVal);

}