//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/certificate_dto.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'module_certificate_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ModuleCertificateDto {
  /// Returns a new [ModuleCertificateDto] instance.
  ModuleCertificateDto({
    required this.moduleId,

    required this.moduleTitle,

    required this.finished,

    required this.awaitingReview,

    required this.certificate,
  });

  @JsonKey(name: r'moduleId', required: true, includeIfNull: false)
  final String moduleId;

  @JsonKey(name: r'moduleTitle', required: true, includeIfNull: false)
  final String moduleTitle;

  /// Every lesson done and the module's project shipped.
  @JsonKey(name: r'finished', required: true, includeIfNull: false)
  final bool finished;

  /// Finished, but a mentor hasn't approved the module project yet (premium students get their certificate once the review is approved).
  @JsonKey(name: r'awaitingReview', required: true, includeIfNull: false)
  final bool awaitingReview;

  @JsonKey(name: r'certificate', required: true, includeIfNull: true)
  final CertificateDto? certificate;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ModuleCertificateDto &&
          other.moduleId == moduleId &&
          other.moduleTitle == moduleTitle &&
          other.finished == finished &&
          other.awaitingReview == awaitingReview &&
          other.certificate == certificate;

  @override
  int get hashCode =>
      moduleId.hashCode +
      moduleTitle.hashCode +
      finished.hashCode +
      awaitingReview.hashCode +
      (certificate == null ? 0 : certificate.hashCode);

  factory ModuleCertificateDto.fromJson(Map<String, dynamic> json) =>
      _$ModuleCertificateDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ModuleCertificateDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
