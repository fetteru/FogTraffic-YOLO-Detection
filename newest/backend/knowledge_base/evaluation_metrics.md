# 目标检测评估指标

IoU 是 Intersection over Union 的缩写，用于衡量预测框和真实框的重叠程度。IoU 等于两个框交集面积除以并集面积，取值范围为 0 到 1，越大表示定位越准确。

Precision 表示预测为正的目标中有多少是真正目标，Recall 表示真实目标中有多少被模型检测出来。Precision 更关注误检，Recall 更关注漏检。

mAP 是 mean Average Precision，用来综合评估检测模型在不同类别上的检测效果。mAP@0.5 表示 IoU 阈值为 0.5 时的平均精度，mAP@0.5:0.95 会在多个 IoU 阈值下取平均，更严格。
