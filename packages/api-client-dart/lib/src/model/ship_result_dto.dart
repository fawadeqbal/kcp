//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/check_result_dto.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'ship_result_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ShipResultDto {
  /// Returns a new [ShipResultDto] instance.
  ShipResultDto({
    required this.shipped,

    required this.results,

    required this.xpAwarded,

    required this.dailyCapReached,

    required this.badgesEarned,

    required this.portfolioItemId,

    required this.version,
  });

  /// False when a requirement isn't met yet: nothing was published.
  @JsonKey(name: r'shipped', required: true, includeIfNull: false)
  final bool shipped;

  /// The result stored for each requirement.
  @JsonKey(name: r'results', required: true, includeIfNull: false)
  final List<CheckResultDto> results;

  /// XP for shipping the first time (0 afterwards).
  @JsonKey(name: r'xpAwarded', required: true, includeIfNull: false)
  final num xpAwarded;

  @JsonKey(name: r'dailyCapReached', required: true, includeIfNull: false)
  final bool dailyCapReached;

  /// Badges this earned (keys; names are translated in the apps), to celebrate.
  @JsonKey(name: r'badgesEarned', required: true, includeIfNull: false)
  final List<String> badgesEarned;

  @JsonKey(name: r'portfolioItemId', required: true, includeIfNull: true)
  final String? portfolioItemId;

  @JsonKey(name: r'version', required: true, includeIfNull: true)
  final num? version;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ShipResultDto &&
          other.shipped == shipped &&
          other.results == results &&
          other.xpAwarded == xpAwarded &&
          other.dailyCapReached == dailyCapReached &&
          other.badgesEarned == badgesEarned &&
          other.portfolioItemId == portfolioItemId &&
          other.version == version;

  @override
  int get hashCode =>
      shipped.hashCode +
      results.hashCode +
      xpAwarded.hashCode +
      dailyCapReached.hashCode +
      badgesEarned.hashCode +
      (portfolioItemId == null ? 0 : portfolioItemId.hashCode) +
      (version == null ? 0 : version.hashCode);

  factory ShipResultDto.fromJson(Map<String, dynamic> json) =>
      _$ShipResultDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ShipResultDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
