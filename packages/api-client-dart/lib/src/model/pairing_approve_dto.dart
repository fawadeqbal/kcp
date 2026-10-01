//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'pairing_approve_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class PairingApproveDto {
  /// Returns a new [PairingApproveDto] instance.
  PairingApproveDto({required this.code, required this.childId});

  /// What the parent typed or scanned; spaces and dashes don't matter.
  @JsonKey(name: r'code', required: true, includeIfNull: false)
  final String code;

  @JsonKey(name: r'childId', required: true, includeIfNull: false)
  final String childId;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PairingApproveDto &&
          other.code == code &&
          other.childId == childId;

  @override
  int get hashCode => code.hashCode + childId.hashCode;

  factory PairingApproveDto.fromJson(Map<String, dynamic> json) =>
      _$PairingApproveDtoFromJson(json);

  Map<String, dynamic> toJson() => _$PairingApproveDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
