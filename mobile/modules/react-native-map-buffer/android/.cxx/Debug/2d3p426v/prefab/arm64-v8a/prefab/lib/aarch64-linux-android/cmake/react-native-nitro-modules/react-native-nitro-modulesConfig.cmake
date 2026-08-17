if(NOT TARGET react-native-nitro-modules::NitroModules)
add_library(react-native-nitro-modules::NitroModules SHARED IMPORTED)
set_target_properties(react-native-nitro-modules::NitroModules PROPERTIES
    IMPORTED_LOCATION "C:/Users/joti.SIMPLO/Documents/Epochs_Idle/mobile/node_modules/react-native-nitro-modules/android/build/intermediates/cxx/Debug/74ni1b3x/obj/arm64-v8a/libNitroModules.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Users/joti.SIMPLO/Documents/Epochs_Idle/mobile/node_modules/react-native-nitro-modules/android/build/headers/nitromodules"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

