// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'certificate_list_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$CertificateListDtoCWProxy {
  CertificateListDto premium(bool premium);

  CertificateListDto modules(List<ModuleCertificateDto> modules);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `CertificateListDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// CertificateListDto(...).copyWith(id: 12, name: "My name")
  /// ````
  CertificateListDto call({bool premium, List<ModuleCertificateDto> modules});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfCertificateListDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfCertificateListDto.copyWith.fieldName(...)`
class _$CertificateListDtoCWProxyImpl implements _$CertificateListDtoCWProxy {
  const _$CertificateListDtoCWProxyImpl(this._value);

  final CertificateListDto _value;

  @override
  CertificateListDto premium(bool premium) => this(premium: premium);

  @override
  CertificateListDto modules(List<ModuleCertificateDto> modules) =>
      this(modules: modules);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `CertificateListDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// CertificateListDto(...).copyWith(id: 12, name: "My name")
  /// ````
  CertificateListDto call({
    Object? premium = const $CopyWithPlaceholder(),
    Object? modules = const $CopyWithPlaceholder(),
  }) {
    return CertificateListDto(
      premium: premium == const $CopyWithPlaceholder()
          ? _value.premium
          // ignore: cast_nullable_to_non_nullable
          : premium as bool,
      modules: modules == const $CopyWithPlaceholder()
          ? _value.modules
          // ignore: cast_nullable_to_non_nullable
          : modules as List<ModuleCertificateDto>,
    );
  }
}

extension $CertificateListDtoCopyWith on CertificateListDto {
  /// Returns a callable class that can be used as follows: `instanceOfCertificateListDto.copyWith(...)` or like so:`instanceOfCertificateListDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$CertificateListDtoCWProxy get copyWith =>
      _$CertificateListDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

CertificateListDto _$CertificateListDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('CertificateListDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['premium', 'modules']);
      final val = CertificateListDto(
        premium: $checkedConvert('premium', (v) => v as bool),
        modules: $checkedConvert(
          'modules',
          (v) => (v as List<dynamic>)
              .map(
                (e) => ModuleCertificateDto.fromJson(e as Map<String, dynamic>),
              )
              .toList(),
        ),
      );
      return val;
    });

Map<String, dynamic> _$CertificateListDtoToJson(CertificateListDto instance) =>
    <String, dynamic>{
      'premium': instance.premium,
      'modules': instance.modules.map((e) => e.toJson()).toList(),
    };
