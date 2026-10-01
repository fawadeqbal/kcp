//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/payout_dto.dart';
import 'package:kcp_api/src/model/earnings_total_dto.dart';
import 'package:kcp_api/src/model/earning_dto.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'earnings_statement_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class EarningsStatementDto {
  /// Returns a new [EarningsStatementDto] instance.
  EarningsStatementDto({
    required this.totals,

    required this.earnings,

    required this.payouts,
  });

  @JsonKey(name: r'totals', required: true, includeIfNull: false)
  final List<EarningsTotalDto> totals;

  @JsonKey(name: r'earnings', required: true, includeIfNull: false)
  final List<EarningDto> earnings;

  @JsonKey(name: r'payouts', required: true, includeIfNull: false)
  final List<PayoutDto> payouts;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is EarningsStatementDto &&
          other.totals == totals &&
          other.earnings == earnings &&
          other.payouts == payouts;

  @override
  int get hashCode => totals.hashCode + earnings.hashCode + payouts.hashCode;

  factory EarningsStatementDto.fromJson(Map<String, dynamic> json) =>
      _$EarningsStatementDtoFromJson(json);

  Map<String, dynamic> toJson() => _$EarningsStatementDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
