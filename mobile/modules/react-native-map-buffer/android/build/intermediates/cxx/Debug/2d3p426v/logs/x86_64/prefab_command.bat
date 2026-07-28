@echo off
"C:\\Program Files\\Microsoft\\jdk-21.0.12.8-hotspot\\bin\\java" ^
  --class-path ^
  "C:\\Users\\joti.SIMPLO\\.gradle\\caches\\modules-2\\files-2.1\\com.google.prefab\\cli\\2.1.0\\aa32fec809c44fa531f01dcfb739b5b3304d3050\\cli-2.1.0-all.jar" ^
  com.google.prefab.cli.AppKt ^
  --build-system ^
  cmake ^
  --platform ^
  android ^
  --abi ^
  x86_64 ^
  --os-version ^
  24 ^
  --stl ^
  c++_shared ^
  --ndk-version ^
  27 ^
  --output ^
  "C:\\Users\\JOTI~1.SIM\\AppData\\Local\\Temp\\agp-prefab-staging3504669917153977607\\staged-cli-output" ^
  "C:\\Users\\joti.SIMPLO\\.gradle\\caches\\9.3.1\\transforms\\c174bdaddf1c0c6aae661bdd72ab083c\\workspace\\transformed\\react-android-0.85.3-debug\\prefab" ^
  "C:\\Users\\joti.SIMPLO\\Documents\\Epochs_Idle\\mobile\\modules\\react-native-map-buffer\\android\\build\\intermediates\\cxx\\refs\\react-native-nitro-modules\\442l05i4" ^
  "C:\\Users\\joti.SIMPLO\\.gradle\\caches\\9.3.1\\transforms\\ea766dde9f3ea3c01d2fedc68bbc91e7\\workspace\\transformed\\fbjni-0.7.0\\prefab"
