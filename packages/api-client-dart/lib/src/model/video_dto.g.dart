// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'video_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$VideoDtoCWProxy {
  VideoDto provider(String provider);

  VideoDto id(String id);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `VideoDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// VideoDto(...).copyWith(id: 12, name: "My name")
  /// ````
  VideoDto call({String provider, String id});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfVideoDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfVideoDto.copyWith.fieldName(...)`
class _$VideoDtoCWProxyImpl implements _$VideoDtoCWProxy {
  const _$VideoDtoCWProxyImpl(this._value);

  final VideoDto _value;

  @override
  VideoDto provider(String provider) => this(provider: provider);

  @override
  VideoDto id(String id) => this(id: id);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `VideoDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// VideoDto(...).copyWith(id: 12, name: "My name")
  /// ````
  VideoDto call({
    Object? provider = const $CopyWithPlaceholder(),
    Object? id = const $CopyWithPlaceholder(),
  }) {
    return VideoDto(
      provider: provider == const $CopyWithPlaceholder()
          ? _value.provider
          // ignore: cast_nullable_to_non_nullable
          : provider as String,
      id: id == const $CopyWithPlaceholder()
          ? _value.id
          // ignore: cast_nullable_to_non_nullable
          : id as String,
    );
  }
}

extension $VideoDtoCopyWith on VideoDto {
  /// Returns a callable class that can be used as follows: `instanceOfVideoDto.copyWith(...)` or like so:`instanceOfVideoDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$VideoDtoCWProxy get copyWith => _$VideoDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

VideoDto _$VideoDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('VideoDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['provider', 'id']);
      final val = VideoDto(
        provider: $checkedConvert('provider', (v) => v as String),
        id: $checkedConvert('id', (v) => v as String),
      );
      return val;
    });

Map<String, dynamic> _$VideoDtoToJson(VideoDto instance) => <String, dynamic>{
  'provider': instance.provider,
  'id': instance.id,
};
