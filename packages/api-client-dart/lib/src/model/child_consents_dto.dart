//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'child_consents_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ChildConsentsDto {
  /// Returns a new [ChildConsentsDto] instance.
  ChildConsentsDto({
    required this.publicLeaderboards,

    required this.publicPortfolio,
  });

  /// Show the child (nickname and avatar only) on city, country and global leaderboards.
  @JsonKey(name: r'publicLeaderboards', required: true, includeIfNull: false)
  final bool publicLeaderboards;

  /// Let anyone with the link see the child's finished projects.
  @JsonKey(name: r'publicPortfolio', required: true, includeIfNull: false)
  final bool publicPortfolio;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ChildConsentsDto &&
          other.publicLeaderboards == publicLeaderboards &&
          other.publicPortfolio == publicPortfolio;

  @override
  int get hashCode => publicLeaderboards.hashCode + publicPortfolio.hashCode;

  factory ChildConsentsDto.fromJson(Map<String, dynamic> json) =>
      _$ChildConsentsDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ChildConsentsDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
