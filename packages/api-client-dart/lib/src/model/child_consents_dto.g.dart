// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'child_consents_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$ChildConsentsDtoCWProxy {
  ChildConsentsDto publicLeaderboards(bool publicLeaderboards);

  ChildConsentsDto publicPortfolio(bool publicPortfolio);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ChildConsentsDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ChildConsentsDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ChildConsentsDto call({bool publicLeaderboards, bool publicPortfolio});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfChildConsentsDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfChildConsentsDto.copyWith.fieldName(...)`
class _$ChildConsentsDtoCWProxyImpl implements _$ChildConsentsDtoCWProxy {
  const _$ChildConsentsDtoCWProxyImpl(this._value);

  final ChildConsentsDto _value;

  @override
  ChildConsentsDto publicLeaderboards(bool publicLeaderboards) =>
      this(publicLeaderboards: publicLeaderboards);

  @override
  ChildConsentsDto publicPortfolio(bool publicPortfolio) =>
      this(publicPortfolio: publicPortfolio);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ChildConsentsDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ChildConsentsDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ChildConsentsDto call({
    Object? publicLeaderboards = const $CopyWithPlaceholder(),
    Object? publicPortfolio = const $CopyWithPlaceholder(),
  }) {
    return ChildConsentsDto(
      publicLeaderboards: publicLeaderboards == const $CopyWithPlaceholder()
          ? _value.publicLeaderboards
          // ignore: cast_nullable_to_non_nullable
          : publicLeaderboards as bool,
      publicPortfolio: publicPortfolio == const $CopyWithPlaceholder()
          ? _value.publicPortfolio
          // ignore: cast_nullable_to_non_nullable
          : publicPortfolio as bool,
    );
  }
}

extension $ChildConsentsDtoCopyWith on ChildConsentsDto {
  /// Returns a callable class that can be used as follows: `instanceOfChildConsentsDto.copyWith(...)` or like so:`instanceOfChildConsentsDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$ChildConsentsDtoCWProxy get copyWith => _$ChildConsentsDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ChildConsentsDto _$ChildConsentsDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('ChildConsentsDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const ['publicLeaderboards', 'publicPortfolio'],
      );
      final val = ChildConsentsDto(
        publicLeaderboards: $checkedConvert(
          'publicLeaderboards',
          (v) => v as bool,
        ),
        publicPortfolio: $checkedConvert('publicPortfolio', (v) => v as bool),
      );
      return val;
    });

Map<String, dynamic> _$ChildConsentsDtoToJson(ChildConsentsDto instance) =>
    <String, dynamic>{
      'publicLeaderboards': instance.publicLeaderboards,
      'publicPortfolio': instance.publicPortfolio,
    };
