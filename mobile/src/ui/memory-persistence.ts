import { MMKV, createMMKV } from 'react-native-mmkv';

let _mmkvStorage: MMKV | null = null;

// Lazy getter — evita instanciação no escopo global e dependência circular com o Hermes
export const getMmkvStorage = (): MMKV => {
  if (!_mmkvStorage) {
    _mmkvStorage = createMMKV();
  }
  return _mmkvStorage;
};

// Alias de retrocompatibilidade com chamadas existentes que usam mmkvStorage diretamente
export const mmkvStorage = {
  getString: (key: string) => getMmkvStorage().getString(key),
  set: (key: string, value: string | number | boolean) => getMmkvStorage().set(key, value),
  delete: (key: string) => getMmkvStorage().remove(key),
  getAllKeys: () => getMmkvStorage().getAllKeys(),
  contains: (key: string) => getMmkvStorage().contains(key),
};


