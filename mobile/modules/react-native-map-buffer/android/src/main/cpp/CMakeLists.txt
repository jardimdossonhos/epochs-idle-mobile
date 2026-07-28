cmake_minimum_required(VERSION 3.4.1)

set(CMAKE_CXX_STANDARD 20)

find_package(react-native-nitro-modules REQUIRED CONFIG)
find_package(ReactAndroid REQUIRED jsi)

add_library(mapbuffer SHARED
  HybridMapBuffer.cpp
)

target_link_libraries(mapbuffer
  react-native-nitro-modules::NitroModules
  ReactAndroid::jsi
)
