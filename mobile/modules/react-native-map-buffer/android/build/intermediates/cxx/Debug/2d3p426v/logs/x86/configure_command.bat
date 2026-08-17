@echo off
"C:\\Users\\joti.SIMPLO\\AppData\\Local\\Android\\Sdk\\cmake\\3.22.1\\bin\\cmake.exe" ^
  "-HC:\\Users\\joti.SIMPLO\\Documents\\Epochs_Idle\\mobile\\modules\\react-native-map-buffer\\android\\src\\main\\cpp" ^
  "-DCMAKE_SYSTEM_NAME=Android" ^
  "-DCMAKE_EXPORT_COMPILE_COMMANDS=ON" ^
  "-DCMAKE_SYSTEM_VERSION=24" ^
  "-DANDROID_PLATFORM=android-24" ^
  "-DANDROID_ABI=x86" ^
  "-DCMAKE_ANDROID_ARCH_ABI=x86" ^
  "-DANDROID_NDK=C:\\Users\\joti.SIMPLO\\AppData\\Local\\Android\\Sdk\\ndk\\27.0.12077973" ^
  "-DCMAKE_ANDROID_NDK=C:\\Users\\joti.SIMPLO\\AppData\\Local\\Android\\Sdk\\ndk\\27.0.12077973" ^
  "-DCMAKE_TOOLCHAIN_FILE=C:\\Users\\joti.SIMPLO\\AppData\\Local\\Android\\Sdk\\ndk\\27.0.12077973\\build\\cmake\\android.toolchain.cmake" ^
  "-DCMAKE_MAKE_PROGRAM=C:\\Users\\joti.SIMPLO\\AppData\\Local\\Android\\Sdk\\cmake\\3.22.1\\bin\\ninja.exe" ^
  "-DCMAKE_CXX_FLAGS=-O2 -frtti -fexceptions -Wall -fstack-protector-all" ^
  "-DCMAKE_LIBRARY_OUTPUT_DIRECTORY=C:\\Users\\joti.SIMPLO\\Documents\\Epochs_Idle\\mobile\\modules\\react-native-map-buffer\\android\\build\\intermediates\\cxx\\Debug\\2d3p426v\\obj\\x86" ^
  "-DCMAKE_RUNTIME_OUTPUT_DIRECTORY=C:\\Users\\joti.SIMPLO\\Documents\\Epochs_Idle\\mobile\\modules\\react-native-map-buffer\\android\\build\\intermediates\\cxx\\Debug\\2d3p426v\\obj\\x86" ^
  "-DCMAKE_BUILD_TYPE=Debug" ^
  "-DCMAKE_FIND_ROOT_PATH=C:\\Users\\joti.SIMPLO\\Documents\\Epochs_Idle\\mobile\\modules\\react-native-map-buffer\\android\\.cxx\\Debug\\2d3p426v\\prefab\\x86\\prefab" ^
  "-BC:\\Users\\joti.SIMPLO\\Documents\\Epochs_Idle\\mobile\\modules\\react-native-map-buffer\\android\\.cxx\\Debug\\2d3p426v\\x86" ^
  -GNinja ^
  "-DANDROID_STL=c++_shared"
