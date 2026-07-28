#pragma once
#include <NitroModules/HybridObject.hpp>
#include <NitroModules/ArrayBuffer.hpp>
#include <vector>
#include <memory>

using namespace margelo::nitro;

class HybridMapBuffer : public HybridObject {
public:
  explicit HybridMapBuffer() : HybridObject(TAG) {}

  void initialize(double regionCount);
  std::shared_ptr<ArrayBuffer> getBufferA();
  std::shared_ptr<ArrayBuffer> getBufferB();
  double getFrontIndex();
  bool attemptSwap();
  void commitBackBuffer();

  void loadHybridMethods() override;

private:
  static constexpr auto TAG = "MapBuffer";
  std::vector<float> _bufferA;
  std::vector<float> _bufferB;
  int _frontIndex = 0;
  bool _readyToSwap = false;
};
