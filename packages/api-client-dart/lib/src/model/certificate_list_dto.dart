//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/module_certificate_dto.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'certificate_list_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class CertificateListDto {
  /// Returns a new [CertificateListDto] instance.
  CertificateListDto({required this.premium, required this.modules});

  /// Whether the student has premium now (needed for a new certificate).
  @JsonKey(name: r'premium', required: true, includeIfNull: false)
  final bool premium;

  @JsonKey(name: r'modules', required: true, includeIfNull: false)
  final List<ModuleCertificateDto> modules;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CertificateListDto &&
          other.premium == premium &&
          other.modules == modules;

  @override
  int get hashCode => premium.hashCode + modules.hashCode;

  factory CertificateListDto.fromJson(Map<String, dynamic> json) =>
      _$CertificateListDtoFromJson(json);

  Map<String, dynamic> toJson() => _$CertificateListDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
