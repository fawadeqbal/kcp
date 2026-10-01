//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'earning_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class EarningDto {
  /// Returns a new [EarningDto] instance.
  EarningDto({
    required this.id,

    required this.projectTitle,

    required this.projectReference,

    required this.currency,

    required this.amountMinor,

    required this.earnedAt,

    required this.heldUntil,

    required this.releasedAt,
  });

  @JsonKey(name: r'id', required: true, includeIfNull: false)
  final String id;

  @JsonKey(name: r'projectTitle', required: true, includeIfNull: false)
  final String projectTitle;

  /// \"P-0007\".
  @JsonKey(name: r'projectReference', required: true, includeIfNull: false)
  final String projectReference;

  @JsonKey(name: r'currency', required: true, includeIfNull: false)
  final String currency;

  @JsonKey(name: r'amountMinor', required: true, includeIfNull: false)
  final num amountMinor;

  @JsonKey(name: r'earnedAt', required: true, includeIfNull: false)
  final DateTime earnedAt;

  @JsonKey(name: r'heldUntil', required: true, includeIfNull: false)
  final DateTime heldUntil;

  @JsonKey(name: r'releasedAt', required: true, includeIfNull: true)
  final DateTime? releasedAt;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is EarningDto &&
          other.id == id &&
          other.projectTitle == projectTitle &&
          other.projectReference == projectReference &&
          other.currency == currency &&
          other.amountMinor == amountMinor &&
          other.earnedAt == earnedAt &&
          other.heldUntil == heldUntil &&
          other.releasedAt == releasedAt;

  @override
  int get hashCode =>
      id.hashCode +
      projectTitle.hashCode +
      projectReference.hashCode +
      currency.hashCode +
      amountMinor.hashCode +
      earnedAt.hashCode +
      heldUntil.hashCode +
      (releasedAt == null ? 0 : releasedAt.hashCode);

  factory EarningDto.fromJson(Map<String, dynamic> json) =>
      _$EarningDtoFromJson(json);

  Map<String, dynamic> toJson() => _$EarningDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
