# react-native-image-hub

React Native image picker: camera (vision-camera), gallery, and custom cropper

## Installation

```sh
npm install react-native-image-hub
# ou
yarn add react-native-image-hub
```

## Usage

```javascript
import { ImagePicker } from 'react-native-image-hub';

// Selecionar imagem da galeria com opção de crop
const image = await ImagePicker.openPicker({
  width: 400,
  height: 400,
  cropping: true,
});

// Abrir cropper manualmente para uma imagem existente
const cropped = await ImagePicker.openCropper({
  path: 'caminho/da/imagem.jpg',
  width: 300,
  height: 300,
});
```


## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
