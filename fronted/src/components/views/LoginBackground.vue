<script setup>
import AuthShell from '../common/AuthShell.vue';
defineProps({ title: String, subtitle: String });
</script>
<template><AuthShell :title="title" :subtitle="subtitle"><slot/></AuthShell></template>
