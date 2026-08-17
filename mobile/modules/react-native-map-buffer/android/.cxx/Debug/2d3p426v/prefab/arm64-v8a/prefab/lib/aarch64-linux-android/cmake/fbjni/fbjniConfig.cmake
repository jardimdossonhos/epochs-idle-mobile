if(NOT TARGET fbjni::fbjni)
add_library(fbjni::fbjni SHARED IMPORTED)
set_target_properties(fbjni::fbjni PROPERTIES
    IMPORTED_LOCATION "C:/Users/joti.SIMPLO/.gradle/caches/9.3.1/transforms/ea766dde9f3ea3c01d2fedc68bbc91e7/workspace/transformed/fbjni-0.7.0/prefab/modules/fbjni/libs/android.arm64-v8a/libfbjni.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Users/joti.SIMPLO/.gradle/caches/9.3.1/transforms/ea766dde9f3ea3c01d2fedc68bbc91e7/workspace/transformed/fbjni-0.7.0/prefab/modules/fbjni/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

