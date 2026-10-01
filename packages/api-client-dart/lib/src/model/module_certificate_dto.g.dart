// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'module_certificate_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$ModuleCertificateDtoCWProxy {
  ModuleCertificateDto moduleId(String moduleId);

  ModuleCertificateDto moduleTitle(String moduleTitle);

  ModuleCertificateDto finished(bool finished);

  ModuleCertificateDto awaitingReview(bool awaitingReview);

  ModuleCertificateDto certificate(CertificateDto? certificate);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ModuleCertificateDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ModuleCertificateDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ModuleCertificateDto call({
    String moduleId,
    String moduleTitle,
    bool finished,
    bool awaitingReview,
    CertificateDto? certificate,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfModuleCertificateDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfModuleCertificateDto.copyWith.fieldName(...)`
class _$ModuleCertificateDtoCWProxyImpl
    implements _$ModuleCertificateDtoCWProxy {
  const _$ModuleCertificateDtoCWProxyImpl(this._value);

  final ModuleCertificateDto _value;

  @override
  ModuleCertificateDto moduleId(String moduleId) => this(moduleId: moduleId);

  @override
  ModuleCertificateDto moduleTitle(String moduleTitle) =>
      this(moduleTitle: moduleTitle);

  @override
  ModuleCertificateDto finished(bool finished) => this(finished: finished);

  @override
  ModuleCertificateDto awaitingReview(bool awaitingReview) =>
      this(awaitingReview: awaitingReview);

  @override
  ModuleCertificateDto certificate(CertificateDto? certificate) =>
      this(certificate: certificate);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ModuleCertificateDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ModuleCertificateDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ModuleCertificateDto call({
    Object? moduleId = const $CopyWithPlaceholder(),
    Object? moduleTitle = const $CopyWithPlaceholder(),
    Object? finished = const $CopyWithPlaceholder(),
    Object? awaitingReview = const $CopyWithPlaceholder(),
    Object? certificate = const $CopyWithPlaceholder(),
  }) {
    return ModuleCertificateDto(
      moduleId: moduleId == const $CopyWithPlaceholder()
          ? _value.moduleId
          // ignore: cast_nullable_to_non_nullable
          : moduleId as String,
      moduleTitle: moduleTitle == const $CopyWithPlaceholder()
          ? _value.moduleTitle
          // ignore: cast_nullable_to_non_nullable
          : moduleTitle as String,
      finished: finished == const $CopyWithPlaceholder()
          ? _value.finished
          // ignore: cast_nullable_to_non_nullable
          : finished as bool,
      awaitingReview: awaitingReview == const $CopyWithPlaceholder()
          ? _value.awaitingReview
          // ignore: cast_nullable_to_non_nullable
          : awaitingReview as bool,
      certificate: certificate == const $CopyWithPlaceholder()
          ? _value.certificate
          // ignore: cast_nullable_to_non_nullable
          : certificate as CertificateDto?,
    );
  }
}

extension $ModuleCertificateDtoCopyWith on ModuleCertificateDto {
  /// Returns a callable class that can be used as follows: `instanceOfModuleCertificateDto.copyWith(...)` or like so:`instanceOfModuleCertificateDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$ModuleCertificateDtoCWProxy get copyWith =>
      _$ModuleCertificateDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ModuleCertificateDto _$ModuleCertificateDtoFromJson(
  Map<String, dynamic> json,
) => $checkedCreate('ModuleCertificateDto', json, ($checkedConvert) {
  $checkKeys(
    json,
    requiredKeys: const [
      'moduleId',
      'moduleTitle',
      'finished',
      'awaitingReview',
      'certificate',
    ],
  );
  final val = ModuleCertificateDto(
    moduleId: $checkedConvert('moduleId', (v) => v as String),
    moduleTitle: $checkedConvert('moduleTitle', (v) => v as String),
    finished: $checkedConvert('finished', (v) => v as bool),
    awaitingReview: $checkedConvert('awaitingReview', (v) => v as bool),
    certificate: $checkedConvert(
      'certificate',
      (v) =>
          v == null ? null : CertificateDto.fromJson(v as Map<String, dynamic>),
    ),
  );
  return val;
});

Map<String, dynamic> _$ModuleCertificateDtoToJson(
  ModuleCertificateDto instance,
) => <String, dynamic>{
  'moduleId': instance.moduleId,
  'moduleTitle': instance.moduleTitle,
  'finished': instance.finished,
  'awaitingReview': instance.awaitingReview,
  'certificate': instance.certificate?.toJson(),
};
