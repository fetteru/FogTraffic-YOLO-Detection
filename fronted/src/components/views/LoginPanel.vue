<script setup>
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { User, Lock, View, ArrowRight, Check } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { authStore } from '../../stores/auth.js';
const router=useRouter(); const route=useRoute(); const loading=ref(false); const showPassword=ref(false); const form=reactive({username:'admin',password:'123456'});
async function submit(){loading.value=true;try{await authStore.login(form);ElMessage.success('登录成功');router.replace(route.query.redirect || '/app/chat');}catch(e){ElMessage.error(e.message)}finally{loading.value=false}}
</script>
<template>
  <div class="auth-tabs"><button class="active">登录</button><button @click="router.push('/register')">注册</button></div>
  <form class="auth-form" @submit.prevent="submit"><label><span>用户名或邮箱</span><div class="field-shell"><el-icon><User/></el-icon><input v-model="form.username" autocomplete="username" required></div></label><label><span>密码</span><div class="field-shell"><el-icon><Lock/></el-icon><input v-model="form.password" :type="showPassword?'text':'password'" autocomplete="current-password" required><button type="button" @click="showPassword=!showPassword"><el-icon><View/></el-icon></button></div></label><div class="auth-options"><label class="check-label"><input type="checkbox" checked><span></span>保持登录</label><button type="button" class="text-link">忘记密码？</button></div><button class="btn btn-primary btn-auth" :disabled="loading"><span v-if="loading" class="spinner"></span>{{loading?'正在连接…':'进入工作台'}}<el-icon v-if="!loading"><ArrowRight/></el-icon></button></form>
  <div class="direct-register-row"><span>还没有平台账号？</span><button type="button" @click="router.push('/register')">立即创建账号 <el-icon><ArrowRight/></el-icon></button></div>
  <div class="demo-account"><span><el-icon><Check/></el-icon> 演示账号</span><code>admin</code><i>/</i><code>123456</code></div><p class="auth-terms">继续即表示你同意平台使用规范。当前项目为可运行演示版，可在设置中连接真实 FastAPI 后端。</p>
</template>
