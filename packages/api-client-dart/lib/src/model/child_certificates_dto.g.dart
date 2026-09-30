// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'child_certificates_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$ChildCertificatesDtoCWProxy {
  ChildCertificatesDto certificates(List<CertificateDto> certificates);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ChildCertificatesDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ChildCertificatesDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ChildCertificatesDto call({List<CertificateDto> certificates});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfChildCertificatesDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfChildCertificatesDto.copyWith.fieldName(...)`
class _$ChildCertificatesDtoCWProxyImpl
    implements _$ChildCertificatesDtoCWProxy {
  const _$ChildCertificatesDtoCWProxyImpl(this._value);

  final ChildCertificatesDto _value;

  @override
  ChildCertificatesDto certificates(List<CertificateDto> certificates) =>
      this(certificates: certificates);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ChildCertificatesDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ChildCertificatesDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ChildCertificatesDto call({
    Object? certificates = const $CopyWithPlaceholder(),
  }) {
    return ChildCertificatesDto(
      certificates: certificates == const $CopyWithPlaceholder()
          ? _value.certificates
          // ignore: cast_nullable_to_non_nullable
          : certificates as List<CertificateDto>,
    );
  }
}

extension $ChildCertificatesDtoCopyWith on ChildCertificatesDto {
  /// Returns a callable class that can be used as follows: `instanceOfChildCertificatesDto.copyWith(...)` or like so:`instanceOfChildCertificatesDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$ChildCertificatesDtoCWProxy get copyWith =>
      _$ChildCertificatesDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ChildCertificatesDto _$ChildCertificatesDtoFromJson(
  Map<String, dynamic> json,
) => $checkedCreate('ChildCertificatesDto', json, ($checkedConvert) {
  $checkKeys(json, requiredKeys: const ['certificates']);
  final val = ChildCertificatesDto(
    certificates: $checkedConvert(
      'certificates',
      (v) => (v as List<dynamic>)
          .map((e) => CertificateDto.fromJson(e as Map<String, dynamic>))
          .toList(),
    ),
  );
  return val;
});

Map<String, dynamic> _$ChildCertificatesDtoToJson(
  ChildCertificatesDto instance,
) => <String, dynamic>{
  'certificates': instance.certificates.map((e) => e.toJson()).toList(),
};
