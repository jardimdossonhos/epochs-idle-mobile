#include "HybridMapBuffer.hpp"
#include <NitroModules/HybridObjectRegistry.hpp>

void HybridMapBuffer::initialize(double regionCount) {
  size_t count = static_cast<size_t>(regionCount);
  _bufferA.resize(count * 3, 0.0f);
  _bufferB.resize(count * 3, 0.0f);
  _frontIndex = 0;
  _readyToSwap = false;
}

std::shared_ptr<ArrayBuffer> HybridMapBuffer::getBufferA() {
  return NativeArrayBuffer::wrap(reinterpret_cast<uint8_t*>(_bufferA.data()), _bufferA.size() * sizeof(float), [](){});
}

std::shared_ptr<ArrayBuffer> HybridMapBuffer::getBufferB() {
  return NativeArrayBuffer::wrap(reinterpret_cast<uint8_t*>(_bufferB.data()), _bufferB.size() * sizeof(float), [](){});
}

double HybridMapBuffer::getFrontIndex() {
  return static_cast<double>(_frontIndex);
}

bool HybridMapBuffer::attemptSwap() {
  if (_readyToSwap) {
    _readyToSwap = false;
    _frontIndex = _frontIndex == 0 ? 1 : 0;
    return true;
  }
  return false;
}

void HybridMapBuffer::commitBackBuffer() {
  _readyToSwap = true;
}

void HybridMapBuffer::loadHybridMethods() {
  HybridObject::loadHybridMethods();
  registerHybrids(this, [](Prototype& prototype) {
    prototype.registerHybridMethod("initialize", &HybridMapBuffer::initialize);
    prototype.registerHybridMethod("getBufferA", &HybridMapBuffer::getBufferA);
    prototype.registerHybridMethod("getBufferB", &HybridMapBuffer::getBufferB);
    prototype.registerHybridMethod("getFrontIndex", &HybridMapBuffer::getFrontIndex);
    prototype.registerHybridMethod("attemptSwap", &HybridMapBuffer::attemptSwap);
    prototype.registerHybridMethod("commitBackBuffer", &HybridMapBuffer::commitBackBuffer);
  });
}

// Register
static const int _hybridMapBufferRegistration = []() {
  HybridObjectRegistry::registerHybridObjectConstructor(
    "MapBuffer",
    []() -> std::shared_ptr<HybridObject> {
      return std::make_shared<HybridMapBuffer>();
    }
  );
  return 0;
}();
